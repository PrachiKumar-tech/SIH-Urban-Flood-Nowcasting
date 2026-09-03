import math
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from ..data.city_generator import synthetic_city
from ..drainage.network import drainage_network
from ..rainfall.nowcast import rainfall_nowcaster
from ..ml.xgboost_model import ml_surrogate
from ..models.schemas import (
    SeverityLevel, FloodCellSchema, FloodHotspot, FloodMapResponse,
    DrainageNodeSchema, DrainagePipeSchema, DrainageStatusResponse,
    RoadSegmentSchema, RoadStatusResponse, RoadStatusEnum
)

class HydraulicFloodEngine:
    """
    Coupled 2D surface runoff + 1D drainage hydraulic flood engine with real
    NASA SRTM DEM terrain and OpenStreetMap imperviousness layers.
    Calculates mass-balance runoff, drainage inlet capture & surcharge backflow,
    street-level flood depth, flood probability, and severity classification.
    """

    THRESHOLD_SAFE = 5.0
    THRESHOLD_WATCH = 15.0
    THRESHOLD_RISK = 30.0

    def __init__(self, city_data=synthetic_city):
        self.city = city_data
        self.grid_size = city_data.grid_size
        self.cell_area_m2 = city_data.cell_area_m2
        self.elevation = city_data.elevation_grid
        self.slope = city_data.slope_grid
        self.slope_deg = city_data.slope_deg_grid
        self.imperviousness = city_data.imperviousness_grid
        self.log_flow_accum = city_data.log_flow_accum
        self.real_drain_mask = city_data.real_drain_mask
        self.drainage_capacity_estimated = city_data.drainage_capacity_estimated
        self.lats = city_data.grid_lats
        self.lngs = city_data.grid_lngs
        self._map_cells_to_drains()

    def _map_cells_to_drains(self):
        self.cell_to_drain: Dict[Tuple[int, int], str] = {}
        for r in range(self.grid_size):
            for c in range(self.grid_size):
                cell_lat = self.lats[r, c]
                cell_lng = self.lngs[r, c]
                closest_dn = min(
                    self.city.drainage_nodes,
                    key=lambda n: (n["lat"] - cell_lat)**2 + (n["lng"] - cell_lng)**2
                )
                self.cell_to_drain[(r, c)] = closest_dn["id"]

    def classify_severity(self, depth_cm: float) -> SeverityLevel:
        if depth_cm <= self.THRESHOLD_SAFE:
            return SeverityLevel.SAFE
        elif depth_cm <= self.THRESHOLD_WATCH:
            return SeverityLevel.WATCH
        elif depth_cm <= self.THRESHOLD_RISK:
            return SeverityLevel.FLOOD_RISK
        else:
            return SeverityLevel.CRITICAL

    def calculate_flood_probability(self, depth_cm: float, elev_m: float, imp: float) -> float:
        if depth_cm < 1.0:
            return float(np.clip(depth_cm * 0.03, 0.0, 0.15))
        
        logit = (depth_cm - 12.0) / 6.0
        prob = 1.0 / (1.0 + math.exp(-logit))
        
        # Real South Jaipur elevation baseline ~354m-438m MSL
        lowland_factor = max(0.0, (380.0 - elev_m) / 20.0) * 0.15
        imp_factor = imp * 0.12
        
        return float(np.clip(prob + lowland_factor + imp_factor, 0.05, 0.99))

    def estimate_time_to_flood(self, current_depth_cm: float, rain_intensity_mm_hr: float, target_cm: float = 15.0) -> Optional[int]:
        if current_depth_cm >= target_cm:
            return 0
        if rain_intensity_mm_hr <= 5.0:
            return None
        rise_rate_cm_hr = (rain_intensity_mm_hr * 0.6) / 10.0
        if rise_rate_cm_hr <= 0:
            return None
        deficit_cm = target_cm - current_depth_cm
        hours_needed = deficit_cm / rise_rate_cm_hr
        mins = int(hours_needed * 60)
        return min(mins, 180)

    def simulate_step(
        self,
        time_offset_min: int,
        rainfall_multiplier: float = 1.0,
        drain_blockage_pct: float = 0.0,
        initial_ponding_cm: float = 0.0
    ) -> Tuple[List[FloodCellSchema], List[DrainageNodeSchema], List[DrainagePipeSchema], List[RoadSegmentSchema], List[FloodHotspot]]:
        intensity_grid, cum_grid = rainfall_nowcaster.get_rainfall_grid_2d(time_offset_min, rainfall_multiplier)

        # 1. Surface Runoff calculation: Q = C * I * A (m3/s)
        runoff_coeffs = 0.20 + 0.70 * self.imperviousness
        rain_rate_m_s = (intensity_grid / 3.6e6)
        cell_runoff_m3_s = runoff_coeffs * rain_rate_m_s * self.cell_area_m2

        # 2. Inflow collection at drainage nodes
        drain_inflows: Dict[str, float] = {dn["id"]: 0.0 for dn in self.city.drainage_nodes}
        for r in range(self.grid_size):
            for c in range(self.grid_size):
                dn_id = self.cell_to_drain[(r, c)]
                drain_inflows[dn_id] += float(cell_runoff_m3_s[r, c] * 0.65)

        # 3. Solve 1D Drainage hydraulic network
        drain_nodes, drain_pipes, total_overflow, surcharged_cnt = drainage_network.solve_network(
            drain_inflows, blockage_pct=drain_blockage_pct
        )
        drain_node_map = {dn.id: dn for dn in drain_nodes}

        # 4. Compute 2D Surface Water Inundation using Pre-Trained XGBoost Surrogate + Depression Hydraulics
        from ..ml.xgboost_model import ml_surrogate

        rain_eff_mm = np.maximum(cum_grid, intensity_grid * 0.40) * rainfall_multiplier
        features_array = np.column_stack([
            self.elevation.flatten(),
            self.slope.flatten(),
            self.city.log_flow_accum.flatten(),
            self.imperviousness.flatten(),
            self.city.drainage_capacity_estimated.flatten(),
            rain_eff_mm.flatten()
        ])

        try:
            ml_raw_preds = ml_surrogate.predict_vectorized(features_array).reshape(self.grid_size, self.grid_size)
            ml_raw_preds = np.clip(ml_raw_preds, 0.0, None)
        except Exception:
            ml_raw_preds = (rain_eff_mm / 10.0) * runoff_coeffs * 0.45

        elev_depression_factor = np.clip((385.0 - self.elevation) / 12.0, 0.0, 3.5)

        surcharge_grid_cm = np.zeros((self.grid_size, self.grid_size))
        for dn in drain_nodes:
            if dn.is_surcharged and dn.overflow_depth_cm > 0:
                gr, gc = dn.grid_y, dn.grid_x
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        nr, nc = gr + dr, gc + dc
                        if 0 <= nr < self.grid_size and 0 <= nc < self.grid_size:
                            wt = 1.0 if (dr == 0 and dc == 0) else 0.4
                            surcharge_grid_cm[nr, nc] += dn.overflow_depth_cm * wt

        # Blend ML surrogate prediction with local topographic depression amplification & drainage surcharge
        water_depth_2d = ml_raw_preds * (1.0 + 1.2 * elev_depression_factor) + surcharge_grid_cm + initial_ponding_cm
        water_depth_2d = np.clip(water_depth_2d, 0.0, 130.0)

        max_rain_intensity, max_cum_rain = rainfall_nowcaster.get_rainfall_grid_2d(120, rainfall_multiplier)
        pred_features_array = np.column_stack([
            self.elevation.flatten(),
            self.slope.flatten(),
            self.city.log_flow_accum.flatten(),
            self.imperviousness.flatten(),
            self.city.drainage_capacity_estimated.flatten(),
            max_cum_rain.flatten() * rainfall_multiplier
        ])
        try:
            pred_ml_preds = ml_surrogate.predict_vectorized(pred_features_array).reshape(self.grid_size, self.grid_size)
            pred_ml_preds = np.clip(pred_ml_preds, 0.0, None)
        except Exception:
            pred_ml_preds = (max_cum_rain / 10.0) * runoff_coeffs * 0.60

        pred_max_depth_2d = pred_ml_preds * (1.0 + 1.4 * elev_depression_factor) + surcharge_grid_cm * 1.4
        pred_max_depth_2d = np.clip(np.maximum(water_depth_2d, pred_max_depth_2d), 0.0, 150.0)

        flood_cells: List[FloodCellSchema] = []
        for r in range(self.grid_size):
            for c in range(self.grid_size):
                d_cm = round(float(water_depth_2d[r, c]), 1)
                max_d_cm = round(float(pred_max_depth_2d[r, c]), 1)
                elev = round(float(self.elevation[r, c]), 2)
                slp = round(float(self.slope[r, c]), 4)
                imp = round(float(self.imperviousness[r, c]), 2)
                rain_int = round(float(intensity_grid[r, c]), 1)
                prob = round(self.calculate_flood_probability(d_cm, elev, imp), 3)
                tt_flood = self.estimate_time_to_flood(d_cm, rain_int, target_cm=self.THRESHOLD_WATCH)
                sev = self.classify_severity(d_cm)
                dn_id = self.cell_to_drain[(r, c)]
                dn_item = drain_node_map.get(dn_id)

                flood_cells.append(FloodCellSchema(
                    id=f"cell_{r}_{c}",
                    lat=round(float(self.lats[r, c]), 6),
                    lng=round(float(self.lngs[r, c]), 6),
                    grid_x=c,
                    grid_y=r,
                    elevation_m=elev,
                    slope=slp,
                    imperviousness=imp,
                    rainfall_intensity_mm_hr=rain_int,
                    runoff_m3_s=round(float(cell_runoff_m3_s[r, c]), 3),
                    drain_inflow_m3_s=round(float(cell_runoff_m3_s[r, c] * 0.65), 3),
                    drain_overflow_m3_s=round(float(dn_item.overflow_m3_s if dn_item else 0.0), 2),
                    water_depth_cm=d_cm,
                    predicted_max_depth_cm=max_d_cm,
                    flood_probability=prob,
                    time_to_flood_min=tt_flood,
                    severity=sev
                ))

        road_segments: List[RoadSegmentSchema] = []
        for road in self.city.road_segments:
            gr, gc = road["grid_y"], road["grid_x"]
            cat = road["category"]
            nearby_dn = drain_node_map.get(road["nearby_drain_id"])

            cell_depth = float(water_depth_2d[gr, gc])
            if cat == "bridge":
                road_depth = min(cell_depth * 0.08, 3.0)
            elif cat == "underpass":
                road_depth = cell_depth * 1.60 + (nearby_dn.overflow_depth_cm * 0.9 if nearby_dn and nearby_dn.is_surcharged else 0.0)
            else:
                road_depth = cell_depth

            road_depth = round(min(road_depth, 140.0), 1)
            pred_max_road_depth = round(float(pred_max_depth_2d[gr, gc]) * (0.1 if cat == "bridge" else 1.6 if cat == "underpass" else 1.0), 1)
            road_prob = round(self.calculate_flood_probability(road_depth, road["elevation_m"], 0.88), 3)
            sev = self.classify_severity(road_depth)

            impassable_normal = road_depth >= 15.0
            impassable_emergency = road_depth >= 35.0

            if road_depth < 5.0:
                status = RoadStatusEnum.OPEN
                rec_action = "Normal traffic flow across South Jaipur corridor. Monitor weather radar."
            elif road_depth < 15.0:
                status = RoadStatusEnum.CAUTION
                rec_action = "Speed limit 20 km/h. Low-slung passenger cars proceed with caution."
            elif road_depth < 30.0:
                status = RoadStatusEnum.RESTRICTED
                rec_action = "Traffic diversion in effect. Light motor vehicles restricted; heavy rescue vehicles only."
            else:
                status = RoadStatusEnum.CLOSED
                rec_action = "ROAD CLOSED: Severe underpass submergence. Barricades deployed, use elevated flyover detour."

            tt_close = self.estimate_time_to_flood(road_depth, float(intensity_grid[gr, gc]), target_cm=15.0)

            road_segments.append(RoadSegmentSchema(
                id=road["id"],
                name=road["name"],
                category=road["category"],
                coordinates=road["coordinates"],
                length_m=road["length_m"],
                elevation_m=road["elevation_m"],
                current_depth_cm=road_depth,
                predicted_max_depth_cm=pred_max_road_depth,
                flood_probability=road_prob,
                status=status,
                severity=sev,
                time_to_closure_min=tt_close,
                nearby_drain_id=road["nearby_drain_id"],
                drain_utilization_pct=round(nearby_dn.utilization_pct if nearby_dn else 0.0, 1),
                recommended_action=rec_action,
                impassable_for_normal=impassable_normal,
                impassable_for_emergency=impassable_emergency
            ))

        hotspots = [
            FloodHotspot(
                id="HS-01",
                name="World Trade Park (WTP) Underpass Sump",
                lat=float(self.lats[8, 8]),
                lng=float(self.lngs[8, 8]),
                water_depth_cm=round(float(water_depth_2d[8, 8] * 1.60), 1),
                severity=self.classify_severity(float(water_depth_2d[8, 8] * 1.60)),
                flood_probability=round(self.calculate_flood_probability(float(water_depth_2d[8, 8] * 1.60), float(self.elevation[8, 8]), 0.92), 3),
                description="Sunken grade-separated commercial underpass at WTP / JLN Marg receiving heavy surcharge overflow from drain DN-03.",
                nearest_drain_id="DN-03",
                drain_utilization_pct=round(drain_node_map["DN-03"].utilization_pct, 1)
            ),
            FloodHotspot(
                id="HS-02",
                name="Jawahar Circle / JLN Marg Junction",
                lat=float(self.lats[4, 6]),
                lng=float(self.lngs[4, 6]),
                water_depth_cm=round(float(water_depth_2d[4, 6] * 1.45), 1),
                severity=self.classify_severity(float(water_depth_2d[4, 6] * 1.45)),
                flood_probability=round(self.calculate_flood_probability(float(water_depth_2d[4, 6] * 1.45), float(self.elevation[4, 6]), 0.88), 3),
                description="Major circular roundabout basin receiving convergent runoff from northern Malviya Nagar.",
                nearest_drain_id="DN-01",
                drain_utilization_pct=round(drain_node_map["DN-01"].utilization_pct, 1)
            ),
            FloodHotspot(
                id="HS-03",
                name="Jagatpura Railway Flyover Underpass",
                lat=float(self.lats[24, 24]),
                lng=float(self.lngs[24, 24]),
                water_depth_cm=round(float(water_depth_2d[24, 24] * 1.55), 1),
                severity=self.classify_severity(float(water_depth_2d[24, 24] * 1.55)),
                flood_probability=round(self.calculate_flood_probability(float(water_depth_2d[24, 24] * 1.55), float(self.elevation[24, 24]), 0.86), 3),
                description="Constricted railway underpass basin with constricted storm culvert at DN-13.",
                nearest_drain_id="DN-13",
                drain_utilization_pct=round(drain_node_map["DN-13"].utilization_pct, 1)
            ),
            FloodHotspot(
                id="HS-04",
                name="Jaipur Airport Terminal 2 Lowland",
                lat=float(self.lats[20, 11]),
                lng=float(self.lngs[20, 11]),
                water_depth_cm=round(float(water_depth_2d[20, 11] * 1.40), 1),
                severity=self.classify_severity(float(water_depth_2d[20, 11] * 1.40)),
                flood_probability=round(self.calculate_flood_probability(float(water_depth_2d[20, 11] * 1.40), float(self.elevation[20, 11]), 0.85), 3),
                description="Airport entrance corridor and apron drainage receiving overland surcharge during cloudburst events.",
                nearest_drain_id="DN-10",
                drain_utilization_pct=round(drain_node_map["DN-10"].utilization_pct, 1)
            )
        ]

        return flood_cells, drain_nodes, drain_pipes, road_segments, hotspots

hydraulic_engine = HydraulicFloodEngine()
