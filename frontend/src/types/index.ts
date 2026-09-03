export type SeverityLevel = "SAFE" | "WATCH" | "FLOOD_RISK" | "CRITICAL";
export type VehicleType = "normal" | "emergency";
export type RoadStatusEnum = "OPEN" | "CAUTION" | "RESTRICTED" | "CLOSED";

export interface RainfallGridPoint {
  id: string;
  lat: number;
  lng: number;
  grid_x: number;
  grid_y: number;
  intensity_mm_hr: number;
  cumulative_rain_mm: number;
}

export interface RainfallForecastStep {
  time_offset_min: number;
  time_label: string;
  mean_intensity_mm_hr: number;
  max_intensity_mm_hr: number;
  grid: RainfallGridPoint[];
}

export interface RainfallNowcastResponse {
  scenario_name: string;
  current_time_offset_min: number;
  multiplier: number;
  forecast_steps: RainfallForecastStep[];
}

export interface DrainageNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  grid_x: number;
  grid_y: number;
  invert_elevation_m: number;
  ground_elevation_m: number;
  design_capacity_m3_s: number;
  current_capacity_m3_s: number;
  inflow_m3_s: number;
  utilization_pct: number;
  is_surcharged: boolean;
  overflow_m3_s: number;
  overflow_depth_cm: number;
  connected_pipes: string[];
  affected_road_ids: string[];
}

export interface DrainagePipe {
  id: string;
  from_node: string;
  to_node: string;
  diameter_m: number;
  length_m: number;
  slope: number;
  roughness: number;
  capacity_m3_s: number;
  current_flow_m3_s: number;
  utilization_pct: number;
  is_bottleneck: boolean;
  coordinates: [number, number][];
}

export interface DrainageStatusResponse {
  time_offset_min: number;
  total_nodes: number;
  surcharged_nodes_count: number;
  bottleneck_pipes_count: number;
  total_overflow_m3_s: number;
  nodes: DrainageNode[];
  pipes: DrainagePipe[];
}

export interface FloodCell {
  id: string;
  lat: number;
  lng: number;
  grid_x: number;
  grid_y: number;
  elevation_m: number;
  slope: number;
  imperviousness: number;
  rainfall_intensity_mm_hr: number;
  runoff_m3_s: number;
  drain_inflow_m3_s: number;
  drain_overflow_m3_s: number;
  water_depth_cm: number;
  predicted_max_depth_cm: number;
  flood_probability: number;
  time_to_flood_min: number | null;
  severity: SeverityLevel;
}

export interface FloodHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  water_depth_cm: number;
  severity: SeverityLevel;
  flood_probability: number;
  description: string;
  nearest_drain_id: string;
  drain_utilization_pct: number;
}

export interface FloodMapResponse {
  time_offset_min: number;
  time_label: string;
  cells: FloodCell[];
  hotspots: FloodHotspot[];
  max_depth_cm: number;
  mean_depth_cm: number;
  flooded_area_pct: number;
  high_risk_location: string;
  prediction_confidence: number;
  simulation_mode: "physical" | "ml_surrogate";
}

export interface RoadSegment {
  id: string;
  name: string;
  category: "arterial" | "collector" | "local" | "underpass" | "bridge";
  coordinates: [number, number][];
  length_m: number;
  elevation_m: number;
  current_depth_cm: number;
  predicted_max_depth_cm: number;
  flood_probability: number;
  status: RoadStatusEnum;
  severity: SeverityLevel;
  time_to_closure_min: number | null;
  nearby_drain_id: string;
  drain_utilization_pct: number;
  recommended_action: string;
  impassable_for_normal: boolean;
  impassable_for_emergency: boolean;
}

export interface RoadProgressionPoint {
  time: string;
  time_min: number;
  open: number;
  caution: number;
  closed: number;
  total: number;
}

export interface RoadStatusResponse {
  time_offset_min: number;
  total_roads: number;
  open_roads: number;
  caution_roads: number;
  closed_roads: number;
  roads: RoadSegment[];
  road_progression?: RoadProgressionPoint[];
}

export interface RouteStep {
  road_id: string;
  road_name: string;
  length_m: number;
  water_depth_cm: number;
  flood_probability: number;
  status: RoadStatusEnum;
  coordinates: [number, number][];
}

export interface RouteDetails {
  path_found: boolean;
  total_distance_m: number;
  estimated_time_min: number;
  max_water_depth_cm: number;
  mean_flood_probability: number;
  overall_risk: SeverityLevel;
  roads_avoided_count: number;
  roads_avoided_names: string[];
  steps: RouteStep[];
  polyline: [number, number][];
  reasons: string[];
}

export interface RouteRequest {
  origin_road_id?: string;
  destination_road_id?: string;
  vehicle_type?: VehicleType;
  time_offset_min?: number;
}

export interface RouteResponse {
  vehicle_type: VehicleType;
  time_offset_min: number;
  normal_route: RouteDetails | null;
  safe_route: RouteDetails | null;
  recommendation: string;
  reroute_justification: string;
}

export interface WhatIfRequest {
  rainfall_multiplier: number;
  drain_blockage_pct: number;
  initial_ponding_cm: number;
  use_ml_surrogate: boolean;
  custom_scenario?: string;
}

export interface MLMetrics {
  model_type: string;
  training_samples: number;
  test_samples: number;
  training_duration_ms: number;
  mae_cm: number;
  rmse_cm: number;
  r2_score: number;
  feature_importances: Record<string, number>;
  inference_latency_ms: number;
  physical_solver_latency_ms: number;
  speedup_factor: string;
}
