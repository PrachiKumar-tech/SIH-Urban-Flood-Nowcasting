import math
import numpy as np
import networkx as nx
from typing import Dict, List, Tuple, Any
from ..data.city_generator import synthetic_city
from ..models.schemas import DrainageNodeSchema, DrainagePipeSchema, DrainageStatusResponse

class DrainageNetworkModel:
    """
    1D Urban Drainage Hydraulic Network Model.
    Couples surface runoff collection with pipe gravity flow capacity,
    detects bottleneck surcharge, and models overflow back into surface cells.
    """

    def __init__(self, city_data=synthetic_city):
        self.city = city_data
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        for node in self.city.drainage_nodes:
            self.graph.add_node(
                node["id"],
                name=node["name"],
                lat=node["lat"],
                lng=node["lng"],
                grid_x=node["grid_x"],
                grid_y=node["grid_y"],
                invert_elevation_m=node["invert_elevation_m"],
                ground_elevation_m=node["ground_elevation_m"],
                design_capacity_m3_s=node["design_capacity_m3_s"],
                is_outfall=node["is_outfall"],
                is_bottleneck=node["is_bottleneck"],
                connected_pipes=node["connected_pipes"],
                affected_road_ids=node["affected_road_ids"]
            )

        for pipe in self.city.drainage_pipes:
            self.graph.add_edge(
                pipe["from_node"],
                pipe["to_node"],
                id=pipe["id"],
                diameter_m=pipe["diameter_m"],
                length_m=pipe["length_m"],
                slope=pipe["slope"],
                roughness=pipe["roughness"],
                capacity_m3_s=pipe["capacity_m3_s"],
                is_bottleneck=pipe["is_bottleneck"],
                coordinates=pipe["coordinates"]
            )

    def solve_network(
        self,
        surface_inflows: Dict[str, float],
        blockage_pct: float = 0.0
    ) -> Tuple[List[DrainageNodeSchema], List[DrainagePipeSchema], float, int]:
        blockage_factor = min(max(blockage_pct / 100.0, 0.0), 0.95)
        node_results: List[DrainageNodeSchema] = []
        pipe_results: List[DrainagePipeSchema] = []
        total_overflow = 0.0
        surcharged_count = 0

        accumulated_flow: Dict[str, float] = {nid: surface_inflows.get(nid, 0.0) for nid in self.graph.nodes()}

        try:
            topo_order = list(nx.topological_sort(self.graph))
        except Exception:
            topo_order = list(self.graph.nodes())

        for u in topo_order:
            node_data = self.graph.nodes[u]
            u_inflow = accumulated_flow[u]
            base_cap = node_data["design_capacity_m3_s"]
            eff_cap = max(base_cap * (1.0 - blockage_factor), 0.2)

            out_edges = list(self.graph.out_edges(u, data=True))
            if out_edges:
                total_outgoing_pipe_cap = sum(d["capacity_m3_s"] * (1.0 - blockage_factor) for _, _, d in out_edges)
                eff_cap = min(eff_cap, total_outgoing_pipe_cap)

            is_surcharged = u_inflow > eff_cap and not node_data["is_outfall"]
            overflow = max(u_inflow - eff_cap, 0.0) if not node_data["is_outfall"] else 0.0
            actual_drained_flow = min(u_inflow, eff_cap)

            if is_surcharged:
                surcharged_count += 1
                total_overflow += overflow

            utilization = (u_inflow / eff_cap * 100.0) if eff_cap > 0 else 100.0
            overflow_depth_cm = (overflow * 600.0 / self.city.cell_area_m2) * 100.0 if is_surcharged else 0.0

            node_results.append(DrainageNodeSchema(
                id=u,
                name=node_data["name"],
                lat=node_data["lat"],
                lng=node_data["lng"],
                grid_x=node_data["grid_x"],
                grid_y=node_data["grid_y"],
                invert_elevation_m=node_data["invert_elevation_m"],
                ground_elevation_m=node_data["ground_elevation_m"],
                design_capacity_m3_s=round(base_cap, 2),
                current_capacity_m3_s=round(eff_cap, 2),
                inflow_m3_s=round(u_inflow, 2),
                utilization_pct=round(min(utilization, 250.0), 1),
                is_surcharged=is_surcharged,
                overflow_m3_s=round(overflow, 2),
                overflow_depth_cm=round(overflow_depth_cm, 1),
                connected_pipes=node_data["connected_pipes"],
                affected_road_ids=node_data["affected_road_ids"]
            ))

            if out_edges:
                total_pipe_cap = sum(d["capacity_m3_s"] for _, _, d in out_edges)
                for _, v, d in out_edges:
                    p_cap = d["capacity_m3_s"] * (1.0 - blockage_factor)
                    frac = (d["capacity_m3_s"] / total_pipe_cap) if total_pipe_cap > 0 else (1.0 / len(out_edges))
                    p_flow = actual_drained_flow * frac
                    accumulated_flow[v] = accumulated_flow.get(v, 0.0) + p_flow

                    p_util = (p_flow / p_cap * 100.0) if p_cap > 0 else 100.0
                    pipe_results.append(DrainagePipeSchema(
                        id=d["id"],
                        from_node=u,
                        to_node=v,
                        diameter_m=d["diameter_m"],
                        length_m=d["length_m"],
                        slope=d["slope"],
                        roughness=d["roughness"],
                        capacity_m3_s=round(p_cap, 2),
                        current_flow_m3_s=round(p_flow, 2),
                        utilization_pct=round(min(p_util, 250.0), 1),
                        is_bottleneck=d["is_bottleneck"] or p_util > 90.0,
                        coordinates=d["coordinates"]
                    ))

        return node_results, pipe_results, total_overflow, surcharged_count

drainage_network = DrainageNetworkModel()
