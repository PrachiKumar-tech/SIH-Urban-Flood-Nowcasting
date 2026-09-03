import pytest
import numpy as np
from fastapi.testclient import TestClient
from backend.main import app
from backend.flood.hydraulic_engine import hydraulic_engine
from backend.drainage.network import drainage_network
from backend.routing.engine import routing_engine
from backend.ml.xgboost_model import ml_surrogate
from backend.models.schemas import SeverityLevel, VehicleType, RouteRequest, WhatIfRequest

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Active" in data["catchment"] or "Study" in data["catchment"] or "Pilot" in data["catchment"]

def test_real_dem_and_hydraulic_simulation():
    cells, d_nodes, d_pipes, roads, hotspots = hydraulic_engine.simulate_step(
        time_offset_min=90,
        rainfall_multiplier=1.0,
        drain_blockage_pct=0.0
    )
    assert len(cells) > 1000  # 36x36 = 1296 cells
    assert len(roads) >= 20
    assert len(d_nodes) >= 15
    assert len(hotspots) >= 3

    depths = [c.water_depth_cm for c in cells]
    assert max(depths) > 10.0
    assert min(depths) >= 0.0

def test_drainage_surcharge_and_blockage():
    _, _, overflow_normal, surcharged_normal = drainage_network.solve_network(
        surface_inflows={"DN-09": 4.0, "DN-11": 3.5, "DN-14": 3.0},
        blockage_pct=0.0
    )
    _, _, overflow_blocked, surcharged_blocked = drainage_network.solve_network(
        surface_inflows={"DN-09": 4.0, "DN-11": 3.5, "DN-14": 3.0},
        blockage_pct=50.0
    )
    assert overflow_blocked >= overflow_normal
    assert surcharged_blocked >= surcharged_normal

def test_flood_severity_classification():
    assert hydraulic_engine.classify_severity(3.0) == SeverityLevel.SAFE
    assert hydraulic_engine.classify_severity(10.0) == SeverityLevel.WATCH
    assert hydraulic_engine.classify_severity(22.0) == SeverityLevel.FLOOD_RISK
    assert hydraulic_engine.classify_severity(45.0) == SeverityLevel.CRITICAL

def test_routing_with_flood_detour():
    _, _, _, roads, _ = hydraulic_engine.simulate_step(
        time_offset_min=120,
        rainfall_multiplier=1.5,
        drain_blockage_pct=40.0
    )
    req = RouteRequest(
        origin_road_id="RD-01",
        destination_road_id="RD-26",
        vehicle_type=VehicleType.NORMAL,
        time_offset_min=120
    )
    res = routing_engine.calculate_route(req, roads)
    assert res.normal_route is not None
    assert res.safe_route is not None
    assert res.safe_route.path_found is True
    assert res.safe_route.max_water_depth_cm <= res.normal_route.max_water_depth_cm

def test_pretrained_ml_surrogate_inference():
    info = ml_surrogate.get_model_info()
    assert "r2_score" in info
    assert info["r2_score"] >= 0.60
    assert "feature_importances" in info
    assert "imperviousness" in info["feature_importances"]
    
    # 6-feature sample vector for Jaipur model
    # ['elevation', 'slope_deg', 'flow_accum', 'imperviousness', 'drainage_capacity_estimated', 'rainfall_mm']
    sample_features = np.array([
        [365.0, 1.2, 4.5, 1.0, 50.0, 100.0],
        [415.0, 5.8, 1.1, 0.0, 5.0, 20.0]
    ])
    preds = ml_surrogate.predict_vectorized(sample_features)
    assert len(preds) == 2
    assert preds[0] > preds[1]

def test_api_flood_map_endpoint():
    response = client.get("/api/flood/map?time_offset_min=60")
    assert response.status_code == 200
    data = response.json()
    assert "cells" in data
    assert len(data["cells"]) > 1000
    assert "hotspots" in data
    assert data["time_offset_min"] == 60

def test_api_what_if_simulation():
    req_body = {
        "rainfall_multiplier": 1.5,
        "drain_blockage_pct": 30.0,
        "initial_ponding_cm": 2.0,
        "use_ml_surrogate": True
    }
    response = client.post("/api/simulation/run", json=req_body)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["timeline_summary"]) == 6
