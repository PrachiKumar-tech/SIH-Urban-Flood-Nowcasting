import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from ..data.city_generator import synthetic_city
from ..flood.hydraulic_engine import hydraulic_engine
from ..rainfall.nowcast import rainfall_nowcaster
from ..ml.xgboost_model import ml_surrogate
from ..routing.engine import routing_engine
from ..models.schemas import (
    WhatIfRequest, FloodMapResponse, DrainageStatusResponse,
    RoadStatusResponse, SimulationRunResponse, RouteRequest, RouteResponse
)

class SimulationController:
    """
    Coordinates multi-step simulation timeline, What-If scenario evaluations,
    real XGBoost surrogate acceleration (model.pkl), and state caching for the dashboard.
    """

    HORIZONS = [0, 30, 60, 90, 120, 180]

    def __init__(self):
        self.current_time_min: int = 0
        self.params = WhatIfRequest(
            rainfall_multiplier=1.0,
            drain_blockage_pct=0.0,
            initial_ponding_cm=0.0,
            use_ml_surrogate=False,
            custom_scenario="Delhi Monsoon Cloudburst Event"
        )
        self.cached_states: Dict[int, Dict[str, Any]] = {}
        self.run_full_timeline()

    def run_full_timeline(self, params: Optional[WhatIfRequest] = None):
        if params:
            self.params = params

        new_cached_states = {}
        for t in self.HORIZONS:
            cells, d_nodes, d_pipes, roads, hotspots = hydraulic_engine.simulate_step(
                time_offset_min=t,
                rainfall_multiplier=self.params.rainfall_multiplier,
                drain_blockage_pct=self.params.drain_blockage_pct,
                initial_ponding_cm=self.params.initial_ponding_cm
            )

            # When ML surrogate mode is enabled, evaluate model.pkl on the 7 real features
            if self.params.use_ml_surrogate:
                features = []
                for c in cells:
                    r, col = c.grid_y, c.grid_x
                    effective_drain_cap = synthetic_city.drainage_capacity_estimated[r, col] * (1.0 - self.params.drain_blockage_pct / 100.0)
                    features.append([
                        synthetic_city.elevation_grid[r, col],
                        synthetic_city.slope_deg_grid[r, col],
                        synthetic_city.log_flow_accum[r, col],
                        synthetic_city.imperviousness_grid[r, col],
                        synthetic_city.real_drain_mask[r, col],
                        effective_drain_cap,
                        c.rainfall_intensity_mm_hr
                    ])
                
                features_array = np.array(features)
                ml_preds = ml_surrogate.predict_vectorized(features_array)
                
                for i, c in enumerate(cells):
                    c.water_depth_cm = round(float(ml_preds[i]), 1)
                    c.severity = hydraulic_engine.classify_severity(c.water_depth_cm)

            depths = [c.water_depth_cm for c in cells]
            surcharged_cnt = sum(1 for d in d_nodes if d.is_surcharged)
            total_overflow = sum(d.overflow_m3_s for d in d_nodes)
            closed_roads = sum(1 for r in roads if r.current_depth_cm >= 30.0)
            caution_roads = sum(1 for r in roads if 5.0 <= r.current_depth_cm < 30.0)
            open_roads = sum(1 for r in roads if r.current_depth_cm < 5.0)

            max_d_idx = int(np.argmax(depths))
            high_risk_loc = f"Grid ({cells[max_d_idx].grid_y}, {cells[max_d_idx].grid_x}) - Central Corridor Lowland"

            new_cached_states[t] = {
                "flood_cells": cells,
                "drain_nodes": d_nodes,
                "drain_pipes": d_pipes,
                "roads": roads,
                "hotspots": hotspots,
                "stats": {
                    "time_offset_min": t,
                    "time_label": f"T+{t} min",
                    "max_depth_cm": round(float(np.max(depths)), 1),
                    "mean_depth_cm": round(float(np.mean(depths)), 1),
                    "flooded_area_pct": round(float(np.mean(np.array(depths) >= 15.0) * 100.0), 1),
                    "surcharged_drains_count": surcharged_cnt,
                    "total_overflow_m3_s": round(total_overflow, 2),
                    "total_roads": len(roads),
                    "open_roads": open_roads,
                    "caution_roads": caution_roads,
                    "closed_roads": closed_roads,
                    "high_risk_location": high_risk_loc,
                    "prediction_confidence": 0.95 if not self.params.use_ml_surrogate else 0.92,
                    "simulation_mode": "ml_surrogate" if self.params.use_ml_surrogate else "physical"
                }
            }

        self.cached_states = new_cached_states

    def get_flood_map(self, time_min: int) -> FloodMapResponse:
        closest_t = min(self.HORIZONS, key=lambda x: abs(x - time_min))
        state = self.cached_states[closest_t]
        st = state["stats"]

        return FloodMapResponse(
            time_offset_min=closest_t,
            time_label=st["time_label"],
            cells=state["flood_cells"],
            hotspots=state["hotspots"],
            max_depth_cm=st["max_depth_cm"],
            mean_depth_cm=st["mean_depth_cm"],
            flooded_area_pct=st["flooded_area_pct"],
            high_risk_location=st["high_risk_location"],
            prediction_confidence=st["prediction_confidence"],
            simulation_mode=st["simulation_mode"]
        )

    def get_drainage_status(self, time_min: int) -> DrainageStatusResponse:
        closest_t = min(self.HORIZONS, key=lambda x: abs(x - time_min))
        state = self.cached_states[closest_t]
        st = state["stats"]
        return DrainageStatusResponse(
            time_offset_min=closest_t,
            total_nodes=len(state["drain_nodes"]),
            surcharged_nodes_count=st["surcharged_drains_count"],
            bottleneck_pipes_count=sum(1 for p in state["drain_pipes"] if p.is_bottleneck),
            total_overflow_m3_s=st["total_overflow_m3_s"],
            nodes=state["drain_nodes"],
            pipes=state["drain_pipes"]
        )

    def get_roads_status(self, time_min: int) -> RoadStatusResponse:
        closest_t = min(self.HORIZONS, key=lambda x: abs(x - time_min))
        state = self.cached_states[closest_t]
        st = state["stats"]
        return RoadStatusResponse(
            time_offset_min=closest_t,
            total_roads=st["total_roads"],
            open_roads=st["open_roads"],
            caution_roads=st["caution_roads"],
            closed_roads=st["closed_roads"],
            roads=state["roads"]
        )

    def calculate_route(self, request: RouteRequest) -> RouteResponse:
        closest_t = min(self.HORIZONS, key=lambda x: abs(x - request.time_offset_min))
        roads = self.cached_states[closest_t]["roads"]
        return routing_engine.calculate_route(request, roads)

    def run_what_if(self, what_if: WhatIfRequest) -> SimulationRunResponse:
        self.run_full_timeline(what_if)
        current_st = self.cached_states[0]["stats"]
        timeline_summaries = [self.cached_states[t]["stats"] for t in self.HORIZONS]

        return SimulationRunResponse(
            status="success",
            scenario_name=what_if.custom_scenario or "Custom Delhi Flood Scenario",
            params=what_if,
            current_summary=current_st,
            timeline_summary=timeline_summaries
        )

simulation_controller = SimulationController()
