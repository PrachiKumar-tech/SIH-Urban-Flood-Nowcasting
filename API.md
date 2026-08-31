# API Documentation: HydroCast AI REST Endpoints

All endpoints are hosted at `http://127.0.0.1:8000/api` (or proxied via `/api` on frontend port 5173).  
Swagger Interactive UI is available at: `http://127.0.0.1:8000/docs`

---

## 1. System Health

### `GET /api/health`
Returns the operational health status and catchment summary metadata.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "system": "Urban Flood Nowcasting System (Drainage & Rainfall Coupling)",
  "version": "1.0.0-SIH2026",
  "catchment": "Indraprastha Urban Catchment (Ward 14)",
  "grid_resolution_m": 166.7,
  "total_roads": 33,
  "total_drain_nodes": 21,
  "ml_acceleration": "XGBoost Surrogate Active"
}
```

---

## 2. Rainfall Nowcasting

### `GET /api/rainfall/current`
Returns current baseline rainfall intensity grid and stats.

### `GET /api/rainfall/forecast`
Returns the 0–3 hour (T+0 to T+180 min) convective storm nowcast steps.

**Query Parameters:**
- `time_offset_min` (int, default=0): Time offset in minutes (0, 30, 60, 90, 120, 180).
- `multiplier` (float, default=1.0): Storm intensity multiplier (0.0 to 3.0).

**Response (200 OK):**
```json
{
  "scenario_name": "Extreme Monsoon Event",
  "current_time_offset_min": 90,
  "multiplier": 1.0,
  "forecast_steps": [
    {
      "time_offset_min": 90,
      "time_label": "T+90 min",
      "mean_intensity_mm_hr": 75.0,
      "max_intensity_mm_hr": 105.2,
      "grid": [
        {
          "id": "rain_0_0",
          "lat": 13.085,
          "lng": 80.200,
          "grid_x": 0,
          "grid_y": 0,
          "intensity_mm_hr": 32.5,
          "cumulative_rain_mm": 48.2
        }
      ]
    }
  ]
}
```

---

## 3. Inundation & Flood Maps

### `GET /api/flood/map`
Returns 2D surface flood depth, probability, severity, and critical sinks for the specified time offset.

**Query Parameters:**
- `time_offset_min` (int, default=0): Time offset in minutes.

**Response (200 OK):**
```json
{
  "time_offset_min": 90,
  "time_label": "T+90 min",
  "max_depth_cm": 62.7,
  "mean_depth_cm": 14.8,
  "flooded_area_pct": 24.2,
  "high_risk_location": "Grid (18, 12) - Sector 7 Basin",
  "prediction_confidence": 0.94,
  "simulation_mode": "physical",
  "cells": [
    {
      "id": "cell_18_12",
      "lat": 13.058,
      "lng": 80.218,
      "grid_x": 12,
      "grid_y": 18,
      "elevation_m": 8.5,
      "slope": 0.003,
      "imperviousness": 0.90,
      "rainfall_intensity_mm_hr": 92.4,
      "runoff_m3_s": 0.71,
      "drain_inflow_m3_s": 0.42,
      "drain_overflow_m3_s": 1.80,
      "water_depth_cm": 62.7,
      "predicted_max_depth_cm": 74.2,
      "flood_probability": 0.985,
      "time_to_flood_min": 0,
      "severity": "CRITICAL"
    }
  ],
  "hotspots": [
    {
      "id": "HS-01",
      "name": "Sector 7 Metro Underpass Sump",
      "lat": 13.058,
      "lng": 80.218,
      "water_depth_cm": 62.7,
      "severity": "CRITICAL",
      "flood_probability": 0.985,
      "description": "Sunken grade-separated underpass experiencing drain surcharge at DN-09.",
      "nearest_drain_id": "DN-09",
      "drain_utilization_pct": 185.0
    }
  ]
}
```

### `GET /api/flood/locations`
Returns array of active flood hotspots.

---

## 4. Drainage Network

### `GET /api/drainage/status`
Returns hydraulic status for all drainage nodes and pipes at time $t$.

**Response (200 OK):**
```json
{
  "time_offset_min": 90,
  "total_nodes": 21,
  "surcharged_nodes_count": 18,
  "bottleneck_pipes_count": 14,
  "total_overflow_m3_s": 24.6,
  "nodes": [
    {
      "id": "DN-09",
      "name": "Sector 7 Underpass Sump (Bottleneck)",
      "lat": 13.058,
      "lng": 80.218,
      "grid_x": 12,
      "grid_y": 18,
      "invert_elevation_m": 5.7,
      "ground_elevation_m": 8.5,
      "design_capacity_m3_s": 1.8,
      "current_capacity_m3_s": 1.8,
      "inflow_m3_s": 3.33,
      "utilization_pct": 185.0,
      "is_surcharged": true,
      "overflow_m3_s": 1.53,
      "overflow_depth_cm": 3.3,
      "connected_pipes": ["DP-07", "DP-08", "DP-09"],
      "affected_road_ids": ["RD-15", "RD-16", "RD-17"]
    }
  ],
  "pipes": [
    {
      "id": "DP-09",
      "from_node": "DN-09",
      "to_node": "DN-13",
      "diameter_m": 0.8,
      "length_m": 612.4,
      "slope": 0.003,
      "roughness": 0.013,
      "capacity_m3_s": 1.45,
      "current_flow_m3_s": 1.45,
      "utilization_pct": 100.0,
      "is_bottleneck": true,
      "coordinates": [[13.058, 80.218], [13.055, 80.224]]
    }
  ]
}
```

---

## 5. Street Network & Road Status

### `GET /api/roads/status`
Returns road segment water depths, closure status, vehicle clearance flags, and recommended emergency actions.

**Response (200 OK):**
```json
{
  "time_offset_min": 90,
  "total_roads": 33,
  "open_roads": 12,
  "caution_roads": 12,
  "closed_roads": 9,
  "roads": [
    {
      "id": "RD-16",
      "name": "Sector 7 Underpass Lowland (Critical Sink)",
      "category": "underpass",
      "coordinates": [[13.058, 80.217], [13.058, 80.221]],
      "length_m": 435.0,
      "elevation_m": 6.5,
      "current_depth_cm": 52.4,
      "predicted_max_depth_cm": 68.0,
      "flood_probability": 0.99,
      "status": "CLOSED",
      "severity": "CRITICAL",
      "time_to_closure_min": 0,
      "nearby_drain_id": "DN-09",
      "drain_utilization_pct": 185.0,
      "recommended_action": "ROAD CLOSED: Severe flooding hazard. Barricades deployed, use safe alternative detour.",
      "impassable_for_normal": true,
      "impassable_for_emergency": true
    }
  ]
}
```

---

## 6. Dynamic Safe Route Planning

### `POST /api/route` (or `GET /api/route`)
Calculates the dynamic shortest path vs. flood-avoiding safe path.

**Request Body:**
```json
{
  "origin_road_id": "RD-01",
  "destination_road_id": "RD-31",
  "vehicle_type": "emergency",
  "time_offset_min": 90
}
```

**Response (200 OK):**
```json
{
  "vehicle_type": "emergency",
  "time_offset_min": 90,
  "normal_route": {
    "path_found": true,
    "total_distance_m": 4820.0,
    "estimated_time_min": 11.4,
    "max_water_depth_cm": 52.4,
    "mean_flood_probability": 0.45,
    "overall_risk": "CRITICAL",
    "roads_avoided_count": 0,
    "roads_avoided_names": [],
    "steps": [],
    "polyline": [[13.082, 80.206], [13.058, 80.218]],
    "reasons": ["Segment experiences high water depth (52.4 cm)."]
  },
  "safe_route": {
    "path_found": true,
    "total_distance_m": 5350.0,
    "estimated_time_min": 8.2,
    "max_water_depth_cm": 3.8,
    "mean_flood_probability": 0.08,
    "overall_risk": "SAFE",
    "roads_avoided_count": 2,
    "roads_avoided_names": [
      "Sector 7 Underpass Lowland (Critical Sink) (52.4 cm)",
      "Old Market Deep Basin Road (Critical Sink) (38.1 cm)"
    ],
    "steps": [],
    "polyline": [[13.082, 80.206], [13.064, 80.231]],
    "reasons": []
  },
  "recommendation": "RECOMMENDATION: Divert all vehicles to Safe Route immediately. Normal corridor impassable.",
  "reroute_justification": "ALERT: The standard shortest route crosses 2 submerged road segments: Sector 7 Underpass Lowland (52.4 cm), Old Market Deep Basin Road (38.1 cm). The Safe Route reroutes via elevated bypasses and open corridors, reducing max water depth from 52.4 cm down to 3.8 cm."
}
```

---

## 7. What-If Scenario Simulator

### `POST /api/simulation/run`
Triggers full multi-horizon re-computation with custom parameters.

**Request Body:**
```json
{
  "rainfall_multiplier": 1.8,
  "drain_blockage_pct": 35.0,
  "initial_ponding_cm": 2.0,
  "use_ml_surrogate": false,
  "custom_scenario": "Severe Cloudburst Scenario"
}
```

---

## 8. ML Surrogate Benchmarks

### `GET /api/ml/metrics`
Returns XGBoost training metrics, latency benchmark, and feature importances.

**Response (200 OK):**
```json
{
  "model_type": "XGBoost Regressor (Surrogate Accelerated Inference)",
  "training_samples": 1800,
  "test_samples": 450,
  "training_duration_ms": 48.2,
  "mae_cm": 2.14,
  "rmse_cm": 3.08,
  "r2_score": 0.892,
  "inference_latency_ms": 0.42,
  "physical_solver_latency_ms": 12.8,
  "speedup_factor": "30.5x",
  "feature_importances": {
    "rainfall_intensity": 0.342,
    "cumulative_rain": 0.261,
    "elevation": 0.145,
    "drainage_utilization": 0.089,
    "imperviousness": 0.074,
    "drainage_capacity": 0.041,
    "slope": 0.026,
    "distance_to_drain": 0.012,
    "previous_water_depth": 0.010
  }
}
```
