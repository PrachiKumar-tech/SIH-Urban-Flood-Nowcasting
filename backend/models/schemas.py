from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class SeverityLevel(str, Enum):
    SAFE = "SAFE"            # 0–5 cm
    WATCH = "WATCH"          # 5–15 cm
    FLOOD_RISK = "FLOOD_RISK"# 15–30 cm
    CRITICAL = "CRITICAL"    # >30 cm


class VehicleType(str, Enum):
    NORMAL = "normal"
    EMERGENCY = "emergency"


class RoadStatusEnum(str, Enum):
    OPEN = "OPEN"
    CAUTION = "CAUTION"
    RESTRICTED = "RESTRICTED"
    CLOSED = "CLOSED"


class Point(BaseModel):
    lat: float
    lng: float


class RainfallGridPoint(BaseModel):
    id: str
    lat: float
    lng: float
    grid_x: int
    grid_y: int
    intensity_mm_hr: float
    cumulative_rain_mm: float


class RainfallForecastStep(BaseModel):
    time_offset_min: int  # e.g., 0, 30, 60, 90, 120, 180
    time_label: str       # "T+0 min", "T+30 min", etc.
    mean_intensity_mm_hr: float
    max_intensity_mm_hr: float
    grid: List[RainfallGridPoint]


class RainfallNowcastResponse(BaseModel):
    scenario_name: str
    current_time_offset_min: int
    multiplier: float
    forecast_steps: List[RainfallForecastStep]


class DrainageNodeSchema(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    grid_x: int
    grid_y: int
    invert_elevation_m: float
    ground_elevation_m: float
    design_capacity_m3_s: float
    current_capacity_m3_s: float  # capacity after blockage
    inflow_m3_s: float
    utilization_pct: float
    is_surcharged: bool
    overflow_m3_s: float
    overflow_depth_cm: float
    connected_pipes: List[str]
    affected_road_ids: List[str]


class DrainagePipeSchema(BaseModel):
    id: str
    from_node: str
    to_node: str
    diameter_m: float
    length_m: float
    slope: float
    roughness: float
    capacity_m3_s: float
    current_flow_m3_s: float
    utilization_pct: float
    is_bottleneck: bool
    coordinates: List[List[float]]  # [[lat, lng], [lat, lng]]


class DrainageStatusResponse(BaseModel):
    time_offset_min: int
    total_nodes: int
    surcharged_nodes_count: int
    bottleneck_pipes_count: int
    total_overflow_m3_s: float
    nodes: List[DrainageNodeSchema]
    pipes: List[DrainagePipeSchema]


class FloodCellSchema(BaseModel):
    id: str
    lat: float
    lng: float
    grid_x: int
    grid_y: int
    elevation_m: float
    slope: float
    imperviousness: float
    rainfall_intensity_mm_hr: float
    runoff_m3_s: float
    drain_inflow_m3_s: float
    drain_overflow_m3_s: float
    water_depth_cm: float
    predicted_max_depth_cm: float
    flood_probability: float
    time_to_flood_min: Optional[int] = None
    severity: SeverityLevel


class FloodHotspot(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    water_depth_cm: float
    severity: SeverityLevel
    flood_probability: float
    description: str
    nearest_drain_id: str
    drain_utilization_pct: float


class FloodMapResponse(BaseModel):
    time_offset_min: int
    time_label: str
    cells: List[FloodCellSchema]
    hotspots: List[FloodHotspot]
    max_depth_cm: float
    mean_depth_cm: float
    flooded_area_pct: float
    high_risk_location: str
    prediction_confidence: float
    simulation_mode: str  # "physical" or "ml_surrogate"


class RoadSegmentSchema(BaseModel):
    id: str
    name: str
    category: str  # "arterial", "collector", "local", "underpass", "bridge"
    coordinates: List[List[float]]  # list of [lat, lng]
    length_m: float
    elevation_m: float
    current_depth_cm: float
    predicted_max_depth_cm: float
    flood_probability: float
    status: RoadStatusEnum
    severity: SeverityLevel
    time_to_closure_min: Optional[int] = None
    nearby_drain_id: str
    drain_utilization_pct: float
    recommended_action: str
    impassable_for_normal: bool
    impassable_for_emergency: bool


class RoadStatusResponse(BaseModel):
    time_offset_min: int
    total_roads: int
    open_roads: int
    caution_roads: int
    closed_roads: int
    roads: List[RoadSegmentSchema]
    road_progression: Optional[List[Dict[str, Any]]] = None


class RouteStep(BaseModel):
    road_id: str
    road_name: str
    length_m: float
    water_depth_cm: float
    flood_probability: float
    status: RoadStatusEnum
    coordinates: List[List[float]]


class RouteDetails(BaseModel):
    path_found: bool
    total_distance_m: float
    estimated_time_min: float
    max_water_depth_cm: float
    mean_flood_probability: float
    overall_risk: SeverityLevel
    roads_avoided_count: int
    roads_avoided_names: List[str]
    steps: List[RouteStep]
    polyline: List[List[float]]
    reasons: List[str]


class RouteRequest(BaseModel):
    origin_road_id: Optional[str] = None
    destination_road_id: Optional[str] = None
    origin_coords: Optional[Point] = None
    destination_coords: Optional[Point] = None
    vehicle_type: VehicleType = VehicleType.NORMAL
    time_offset_min: int = 0
    avoid_closure_threshold_cm: Optional[float] = None


class RouteResponse(BaseModel):
    vehicle_type: VehicleType
    time_offset_min: int
    normal_route: Optional[RouteDetails] = None
    safe_route: Optional[RouteDetails] = None
    recommendation: str
    reroute_justification: str


class WhatIfRequest(BaseModel):
    rainfall_multiplier: float = Field(default=1.0, ge=0.0, le=3.0)
    drain_blockage_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    initial_ponding_cm: float = Field(default=0.0, ge=0.0, le=50.0)
    use_ml_surrogate: bool = False
    custom_scenario: Optional[str] = None


class SimulationRunResponse(BaseModel):
    status: str
    scenario_name: str
    params: WhatIfRequest
    current_summary: Dict[str, Any]
    timeline_summary: List[Dict[str, Any]]
