from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from ..models.schemas import (
    RainfallNowcastResponse, FloodMapResponse, FloodHotspot,
    DrainageStatusResponse, RoadStatusResponse, RouteRequest,
    RouteResponse, WhatIfRequest, SimulationRunResponse, VehicleType
)
from ..simulation.controller import simulation_controller
from ..rainfall.nowcast import rainfall_nowcaster
from ..ml.xgboost_model import ml_surrogate
from ..data.city_generator import synthetic_city

router = APIRouter(prefix="/api")

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "backend_online": True,
        "system": "Urban Flood Nowcasting System (Drainage & Rainfall Coupling)",
        "version": "2.0.0-SIH2026",
        "catchment": "Active Study Area • South Jaipur (Jawahar Circle & Malviya Nagar Catchment)",
        "grid_resolution_m": round(synthetic_city.cell_size_m, 1),
        "total_roads": len(synthetic_city.road_segments),
        "total_drain_nodes": len(synthetic_city.drainage_nodes),
        "dem_loaded": getattr(synthetic_city, "dem_loaded", False),
        "imperviousness_loaded": getattr(synthetic_city, "imp_loaded", False),
        "roads_loaded": getattr(synthetic_city, "roads_loaded", False),
        "ml_model_loaded": getattr(ml_surrogate, "model_loaded", False),
        "data_load_errors": getattr(synthetic_city, "data_load_errors", []),
        "ml_acceleration": "Pre-Trained XGBoost Surrogate (NASA SRTM & OSM Real Data Active)"
    }

@router.get("/rainfall/current", response_model=RainfallNowcastResponse)
def get_current_rainfall(
    multiplier: float = Query(default=1.0, ge=0.0, le=3.0)
):
    return rainfall_nowcaster.get_forecast_response(current_time_min=0, multiplier=multiplier)

@router.get("/rainfall/forecast", response_model=RainfallNowcastResponse)
def get_rainfall_forecast(
    time_offset_min: int = Query(default=0, ge=0, le=180),
    multiplier: float = Query(default=1.0, ge=0.0, le=3.0)
):
    return rainfall_nowcaster.get_forecast_response(current_time_min=time_offset_min, multiplier=multiplier)

@router.get("/flood/map", response_model=FloodMapResponse)
def get_flood_map(
    time_offset_min: int = Query(default=0, ge=0, le=180)
):
    return simulation_controller.get_flood_map(time_offset_min)

@router.get("/flood/locations", response_model=List[FloodHotspot])
def get_flood_locations(
    time_offset_min: int = Query(default=0, ge=0, le=180)
):
    map_res = simulation_controller.get_flood_map(time_offset_min)
    return map_res.hotspots

@router.get("/drainage/status", response_model=DrainageStatusResponse)
def get_drainage_status(
    time_offset_min: int = Query(default=0, ge=0, le=180)
):
    return simulation_controller.get_drainage_status(time_offset_min)

@router.get("/roads/status", response_model=RoadStatusResponse)
def get_roads_status(
    time_offset_min: int = Query(default=0, ge=0, le=180)
):
    return simulation_controller.get_roads_status(time_offset_min)

@router.post("/simulation/run", response_model=SimulationRunResponse)
def run_simulation(what_if: WhatIfRequest):
    return simulation_controller.run_what_if(what_if)

@router.post("/simulation/rainfall", response_model=RainfallNowcastResponse)
def set_simulation_rainfall(
    multiplier: float = Query(default=1.0, ge=0.0, le=3.0),
    time_offset_min: int = Query(default=0, ge=0, le=180)
):
    sim_params = simulation_controller.params
    sim_params.rainfall_multiplier = multiplier
    simulation_controller.run_full_timeline(sim_params)
    return rainfall_nowcaster.get_forecast_response(current_time_min=time_offset_min, multiplier=multiplier)

@router.get("/route", response_model=RouteResponse)
def get_route(
    origin_road_id: Optional[str] = Query(default="RD-01"),
    destination_road_id: Optional[str] = Query(default="RD-26"),
    vehicle_type: VehicleType = Query(default=VehicleType.NORMAL),
    time_offset_min: int = Query(default=0, ge=0, le=180)
):
    req = RouteRequest(
        origin_road_id=origin_road_id,
        destination_road_id=destination_road_id,
        vehicle_type=vehicle_type,
        time_offset_min=time_offset_min
    )
    return simulation_controller.calculate_route(req)

@router.post("/route", response_model=RouteResponse)
def post_route(request: RouteRequest):
    return simulation_controller.calculate_route(request)

@router.get("/ml/metrics")
def get_ml_metrics():
    return ml_surrogate.get_model_info()

@router.get("/city/overview")
def get_city_overview():
    ds = synthetic_city.get_dataset()
    return {
        "city_name": ds["city_name"],
        "bounds": ds["bounds"],
        "elevation_stats": {
            "min_m": float(synthetic_city.elevation_grid.min()),
            "max_m": float(synthetic_city.elevation_grid.max()),
            "mean_m": round(float(synthetic_city.elevation_grid.mean()), 1)
        },
        "road_count": len(synthetic_city.road_segments),
        "drainage_node_count": len(synthetic_city.drainage_nodes),
        "drainage_pipe_count": len(synthetic_city.drainage_pipes)
    }
