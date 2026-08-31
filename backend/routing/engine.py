import math
import numpy as np
import networkx as nx
from typing import Dict, List, Tuple, Any, Optional
from ..data.city_generator import synthetic_city
from ..flood.hydraulic_engine import hydraulic_engine
from ..models.schemas import (
    VehicleType, RoadStatusEnum, SeverityLevel,
    RouteRequest, RouteResponse, RouteDetails, RouteStep, RoadSegmentSchema
)

class FloodAwareRoutingEngine:
    """
    Dynamic road network graph routing engine.
    Calculates standard shortest route vs. flood-risk penalized safe route for
    normal and emergency vehicles using Dijkstra / A* algorithms.
    """

    def __init__(self, city_data=synthetic_city):
        self.city = city_data
        self.base_graph = nx.Graph()
        self._build_road_graph()

    def _build_road_graph(self):
        for node in self.city.road_nodes:
            self.base_graph.add_node(
                node[0],
                name=node[1],
                lat=node[2],
                lng=node[3],
                is_elevated=node[4]
            )

        for road in self.city.road_segments:
            self.base_graph.add_edge(
                road["from_node"],
                road["to_node"],
                id=road["id"],
                name=road["name"],
                category=road["category"],
                length_m=road["length_m"],
                elevation_m=road["elevation_m"],
                coordinates=road["coordinates"],
                nearby_drain_id=road["nearby_drain_id"]
            )

    def _find_nearest_node(self, lat: float, lng: float) -> str:
        best_node = None
        best_dist = float("inf")
        for node in self.city.road_nodes:
            d = math.hypot((node[2] - lat) * 111000, (node[3] - lng) * 108000)
            if d < best_dist:
                best_dist = d
                best_node = node[0]
        return best_node

    def calculate_route(
        self,
        request: RouteRequest,
        road_statuses: List[RoadSegmentSchema]
    ) -> RouteResponse:
        road_status_map = {r.id: r for r in road_statuses}

        start_node = "RN-01"
        dest_node = "RN-19"

        if request.origin_road_id:
            for road in self.city.road_segments:
                if road["id"] == request.origin_road_id:
                    start_node = road["from_node"]
                    break
        elif request.origin_coords:
            start_node = self._find_nearest_node(request.origin_coords.lat, request.origin_coords.lng)

        if request.destination_road_id:
            for road in self.city.road_segments:
                if road["id"] == request.destination_road_id:
                    dest_node = road["to_node"]
                    break
        elif request.destination_coords:
            dest_node = self._find_nearest_node(request.destination_coords.lat, request.destination_coords.lng)

        g_normal = nx.Graph()
        g_safe = nx.Graph()

        is_emergency = request.vehicle_type == VehicleType.EMERGENCY
        closure_depth = 35.0 if is_emergency else 15.0

        for u, v, d in self.base_graph.edges(data=True):
            r_id = d["id"]
            r_stat = road_status_map.get(r_id)
            length_m = d["length_m"]
            depth_cm = r_stat.current_depth_cm if r_stat else 0.0
            prob = r_stat.flood_probability if r_stat else 0.0

            g_normal.add_edge(u, v, weight=length_m, **d)

            if depth_cm >= closure_depth:
                safe_weight = length_m * 1000.0 + 50000.0
            else:
                penalty_factor = (depth_cm / 10.0) ** 2 * (3.5 if is_emergency else 2.0)
                safe_weight = length_m * (1.0 + penalty_factor + prob * 2.0)

            g_safe.add_edge(u, v, weight=safe_weight, **d)

        normal_path_nodes = []
        safe_path_nodes = []
        try:
            normal_path_nodes = nx.shortest_path(g_normal, source=start_node, target=dest_node, weight="weight")
        except Exception:
            normal_path_nodes = []

        try:
            safe_path_nodes = nx.shortest_path(g_safe, source=start_node, target=dest_node, weight="weight")
        except Exception:
            safe_path_nodes = normal_path_nodes

        normal_details = self._build_route_details(normal_path_nodes, road_status_map, g_normal, is_emergency)
        safe_details = self._build_route_details(safe_path_nodes, road_status_map, g_safe, is_emergency)

        avoided_flooded_roads = []
        for step in normal_details.steps:
            if step.water_depth_cm >= closure_depth:
                avoided_flooded_roads.append(f"{step.road_name} ({step.water_depth_cm:.1f} cm)")

        safe_details.roads_avoided_count = len(avoided_flooded_roads)
        safe_details.roads_avoided_names = avoided_flooded_roads

        if avoided_flooded_roads:
            reroute_justification = (
                f"ALERT: The standard shortest route crosses {len(avoided_flooded_roads)} submerged road segments: "
                f"{', '.join(avoided_flooded_roads)}. "
                f"The Safe Route reroutes via elevated bypasses and open corridors, "
                f"reducing max water depth from {normal_details.max_water_depth_cm:.1f} cm down to {safe_details.max_water_depth_cm:.1f} cm."
            )
            recommendation = "RECOMMENDATION: Divert all vehicles to Safe Route immediately. Normal corridor impassable."
        else:
            reroute_justification = "Standard route has negligible flood risk. Safe route coincides with shortest path."
            recommendation = "Normal route is currently clear and safe to travel."

        return RouteResponse(
            vehicle_type=request.vehicle_type,
            time_offset_min=request.time_offset_min,
            normal_route=normal_details,
            safe_route=safe_details,
            recommendation=recommendation,
            reroute_justification=reroute_justification
        )

    def _build_route_details(
        self,
        node_path: List[str],
        road_status_map: Dict[str, RoadSegmentSchema],
        graph: nx.Graph,
        is_emergency: bool
    ) -> RouteDetails:
        if not node_path or len(node_path) < 2:
            return RouteDetails(
                path_found=False,
                total_distance_m=0.0,
                estimated_time_min=0.0,
                max_water_depth_cm=0.0,
                mean_flood_probability=0.0,
                overall_risk=SeverityLevel.SAFE,
                roads_avoided_count=0,
                roads_avoided_names=[],
                steps=[],
                polyline=[],
                reasons=["No viable path found between specified endpoints."]
            )

        steps: List[RouteStep] = []
        full_polyline: List[List[float]] = []
        total_dist = 0.0
        max_depth = 0.0
        probs = []
        reasons = []

        for i in range(len(node_path) - 1):
            u = node_path[i]
            v = node_path[i + 1]
            edge_data = graph[u][v]
            r_id = edge_data["id"]
            r_stat = road_status_map.get(r_id)

            depth_cm = r_stat.current_depth_cm if r_stat else 0.0
            prob = r_stat.flood_probability if r_stat else 0.0
            status = r_stat.status if r_stat else RoadStatusEnum.OPEN

            max_depth = max(max_depth, depth_cm)
            probs.append(prob)
            total_dist += edge_data["length_m"]

            step = RouteStep(
                road_id=r_id,
                road_name=edge_data["name"],
                length_m=edge_data["length_m"],
                water_depth_cm=depth_cm,
                flood_probability=prob,
                status=status,
                coordinates=edge_data["coordinates"]
            )
            steps.append(step)
            full_polyline.extend(edge_data["coordinates"])

        base_speed_kmh = 50.0 if is_emergency else 40.0
        water_slowdown = max(0.2, 1.0 - (max_depth / 40.0) * 0.7)
        eff_speed_kmh = base_speed_kmh * water_slowdown
        eta_min = (total_dist / 1000.0) / eff_speed_kmh * 60.0

        mean_prob = float(np.mean(probs)) if probs else 0.0
        
        if max_depth <= 5.0:
            overall_risk = SeverityLevel.SAFE
        elif max_depth <= 15.0:
            overall_risk = SeverityLevel.WATCH
        elif max_depth <= 30.0:
            overall_risk = SeverityLevel.FLOOD_RISK
        else:
            overall_risk = SeverityLevel.CRITICAL

        if max_depth >= 15.0:
            reasons.append(f"Segment experiences high water depth ({max_depth:.1f} cm).")
        if mean_prob > 0.4:
            reasons.append("Elevated probability of localized flash inundation.")

        return RouteDetails(
            path_found=True,
            total_distance_m=round(total_dist, 1),
            estimated_time_min=round(eta_min, 1),
            max_water_depth_cm=round(max_depth, 1),
            mean_flood_probability=round(mean_prob, 3),
            overall_risk=overall_risk,
            roads_avoided_count=0,
            roads_avoided_names=[],
            steps=steps,
            polyline=full_polyline,
            reasons=reasons
        )

routing_engine = FloodAwareRoutingEngine()
