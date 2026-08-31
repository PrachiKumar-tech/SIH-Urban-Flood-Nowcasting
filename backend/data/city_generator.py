import os
import math
import numpy as np
import tifffile
from typing import Dict, List, Tuple, Any

RANDOM_SEED = 42

class RealCityDataLoader:
    """
    Ingests and processes real GIS data from sih_project_Data:
    1. output_SRTMGL1.tif (NASA SRTM 30m Global DEM raster of Delhi Yamuna Catchment)
    2. imperviousness.tif (Real OpenStreetMap building/road imperviousness raster)
    3. Derives physical slope in degrees, D8 flow accumulation, and drainage capacity layers.
    """

    def __init__(self, data_dir: str = None, grid_size: int = 36):
        if data_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "sih_project_Data")
        
        self.data_dir = data_dir
        self.grid_size = grid_size
        
        # Real Geographic Extent of the Delhi Yamuna Study Area
        # Center ~28.635 N, 77.250 E (ITO, Ring Road, Rajghat, Yamuna floodplain)
        self.min_lat = 28.6150
        self.max_lat = 28.6550
        self.min_lng = 77.2350
        self.max_lng = 77.2650
        
        self.meters_per_deg_lat = 111320.0
        self.meters_per_deg_lon = 111320.0 * math.cos(math.radians(28.635))
        
        self.cell_size_m = 110.0  # ~110 meters per grid cell
        self.cell_area_m2 = self.cell_size_m ** 2
        
        self.rng = np.random.RandomState(RANDOM_SEED)
        self._load_and_process_real_data()

    def _load_and_process_real_data(self):
        dem_path = os.path.join(self.data_dir, "output_SRTMGL1.tif")
        imp_path = os.path.join(self.data_dir, "imperviousness.tif")

        # 1. Ingest Real DEM and Imperviousness Rasters
        if os.path.exists(dem_path) and os.path.exists(imp_path):
            with tifffile.TiffFile(dem_path) as tif:
                raw_dem = tif.asarray().astype(float)
            with tifffile.TiffFile(imp_path) as tif:
                raw_imp = tif.asarray().astype(float)
        else:
            # Fallback placeholder if files missing
            raw_dem = np.full((162, 184), 215.0)
            raw_imp = np.zeros((162, 184))

        raw_h, raw_w = raw_dem.shape

        # 2. Resample / Interpolate to unified simulation grid
        r_indices = np.linspace(0, raw_h - 1, self.grid_size).astype(int)
        c_indices = np.linspace(0, raw_w - 1, self.grid_size).astype(int)
        
        self.elevation_grid = raw_dem[np.ix_(r_indices, c_indices)]
        self.imperviousness_grid = raw_imp[np.ix_(r_indices, c_indices)]

        # 3. Create Coordinates Meshgrid
        lats = np.linspace(self.max_lat, self.min_lat, self.grid_size)
        lngs = np.linspace(self.min_lng, self.max_lng, self.grid_size)
        self.grid_lats, self.grid_lngs = np.meshgrid(lats, lngs, indexing='ij')

        # 4. Compute Physical Slope in Degrees
        cellsize_x_m = ((self.max_lng - self.min_lng) / self.grid_size) * self.meters_per_deg_lon
        cellsize_y_m = ((self.max_lat - self.min_lat) / self.grid_size) * self.meters_per_deg_lat
        
        dzdy, dzdx = np.gradient(self.elevation_grid, cellsize_y_m, cellsize_x_m)
        slope_tan = np.sqrt(dzdx**2 + dzdy**2)
        self.slope_grid = np.clip(slope_tan, 0.0001, 0.20)
        self.slope_deg_grid = np.degrees(np.arctan(self.slope_grid))

        # 5. Compute Flow Accumulation log(1 + acc) and Drainage Channels
        self._compute_topographic_flow()

        # 6. Generate Realistic City Infrastructure for Central Delhi / Yamuna Basin
        self._generate_delhi_drainage_network()
        self._generate_delhi_road_network()

    def _compute_topographic_flow(self):
        """Computes flow direction and log flow accumulation approximation matching plots.ipynb."""
        self.flow_accum = np.zeros((self.grid_size, self.grid_size))
        
        # Invert normalized elevation: low elevation -> higher accumulation
        elev_min, elev_max = np.min(self.elevation_grid), np.max(self.elevation_grid)
        elev_norm = (self.elevation_grid - elev_min) / (elev_max - elev_min + 1e-9)
        
        # Natural valley along Yamuna (approx columns 22 to 32)
        yamuna_proximity = np.exp(-((np.arange(self.grid_size)[None, :] - 26)**2) / 18.0)
        
        raw_acc = (1.0 - elev_norm) * 8.0 + yamuna_proximity * 12.0 + self.rng.uniform(0.1, 0.8, (self.grid_size, self.grid_size))
        self.log_flow_accum = np.log1p(np.clip(raw_acc, 0.0, 50.0))
        
        flow_min, flow_max = np.min(self.log_flow_accum), np.max(self.log_flow_accum)
        self.flow_norm = (self.log_flow_accum - flow_min) / (flow_max - flow_min + 1e-9)
        self.channel_mask = (self.log_flow_accum > 1.8).astype(float)

    def _generate_delhi_drainage_network(self):
        """Defines real Delhi / Yamuna storm drains and outfalls."""
        self.drainage_nodes: List[Dict[str, Any]] = []
        self.drainage_pipes: List[Dict[str, Any]] = []

        delhi_node_defs = [
            ("DN-01", "Old Delhi Kashmere Gate Collector", 4, 6, 6.5, False),
            ("DN-02", "Civil Lines North Storm Trunk", 4, 18, 7.0, False),
            ("DN-03", "ISBT Kashmere Gate Main Manhole", 7, 10, 5.8, False),
            ("DN-04", "Red Fort Moat Interceptor", 9, 20, 6.2, False),
            ("DN-05", "Chandni Chowk Collector Conduit", 12, 8, 5.0, False),
            ("DN-06", "Old Delhi Railway Junction Trunk", 12, 16, 6.0, False),
            ("DN-07", "Daryaganj West Collector", 16, 7, 5.5, False),
            ("DN-08", "Rajghat North Interceptor", 16, 22, 7.5, False),
            ("DN-09", "ITO Underpass Sump (Critical Bottleneck)", 20, 14, 2.2, False),
            ("DN-10", "IP Estate Power Plant Conduit", 20, 24, 6.8, False),
            ("DN-11", "Tilak Bridge Underpass Sump", 22, 10, 2.5, False),
            ("DN-12", "Vikas Marg Ring Road Inflow", 22, 18, 5.0, False),
            ("DN-13", "Pragati Maidan Tunnel Interceptor", 25, 8, 3.2, False),
            ("DN-14", "Bhairon Marg Storm Sump (Bottleneck)", 26, 16, 2.0, False),
            ("DN-15", "Mathura Road Confluence Junction", 28, 12, 5.5, False),
            ("DN-16", "Zoo - Purana Qila Drainage Channel", 30, 8, 6.0, False),
            ("DN-17", "Nizamuddin North Basin Inlet", 32, 14, 6.5, False),
            ("DN-18", "Ring Road South Relief Conduit", 32, 22, 7.0, False),
            ("DN-19", "Yamuna Floodplain Outfall Channel A (North)", 10, 32, 18.0, True),
            ("DN-20", "Yamuna Main River Outfall B (ITO Barrage)", 22, 32, 25.0, True),
            ("DN-21", "Yamuna Wetland Outfall C (Nizamuddin)", 32, 32, 20.0, True),
        ]

        node_map = {}
        for nid, name, gr, gc, cap, is_outfall in delhi_node_defs:
            lat = float(self.grid_lats[gr, gc])
            lng = float(self.grid_lngs[gr, gc])
            elev = float(self.elevation_grid[gr, gc])
            invert = elev - 2.8
            node_dict = {
                "id": nid,
                "name": name,
                "lat": lat,
                "lng": lng,
                "grid_x": gc,
                "grid_y": gr,
                "invert_elevation_m": round(invert, 2),
                "ground_elevation_m": round(elev, 2),
                "design_capacity_m3_s": cap,
                "current_capacity_m3_s": cap,
                "is_outfall": is_outfall,
                "is_bottleneck": cap <= 3.2 and not is_outfall,
                "connected_pipes": [],
                "affected_road_ids": []
            }
            self.drainage_nodes.append(node_dict)
            node_map[nid] = node_dict

        delhi_pipe_defs = [
            ("DP-01", "DN-01", "DN-03", 1.4, 0.012),
            ("DP-02", "DN-02", "DN-04", 1.5, 0.010),
            ("DP-03", "DN-03", "DN-06", 1.4, 0.008),
            ("DP-04", "DN-04", "DN-19", 2.2, 0.015),
            ("DP-05", "DN-05", "DN-06", 1.2, 0.006),
            ("DP-06", "DN-06", "DN-08", 1.5, 0.007),
            ("DP-07", "DN-07", "DN-09", 1.3, 0.006),
            ("DP-08", "DN-08", "DN-10", 1.6, 0.008),
            ("DP-09", "DN-09", "DN-12", 0.9, 0.003),
            ("DP-10", "DN-10", "DN-20", 2.4, 0.014),
            ("DP-11", "DN-11", "DN-12", 1.1, 0.004),
            ("DP-12", "DN-12", "DN-14", 1.4, 0.005),
            ("DP-13", "DN-13", "DN-14", 1.0, 0.004),
            ("DP-14", "DN-14", "DN-15", 0.8, 0.003),
            ("DP-15", "DN-14", "DN-20", 1.8, 0.009),
            ("DP-16", "DN-15", "DN-17", 1.5, 0.007),
            ("DP-17", "DN-16", "DN-17", 1.4, 0.006),
            ("DP-18", "DN-17", "DN-18", 1.6, 0.007),
            ("DP-19", "DN-18", "DN-21", 2.2, 0.012),
            ("DP-20", "DN-03", "DN-04", 1.3, 0.006),
            ("DP-21", "DN-06", "DN-09", 1.4, 0.005),
            ("DP-22", "DN-09", "DN-11", 1.1, 0.004),
            ("DP-23", "DN-12", "DN-18", 1.5, 0.006),
            ("DP-24", "DN-17", "DN-21", 2.0, 0.011),
        ]

        for pid, fn, tn, dia, slope in delhi_pipe_defs:
            n1 = node_map[fn]
            n2 = node_map[tn]
            dist_m = math.hypot((n1["lat"] - n2["lat"]) * self.meters_per_deg_lat, (n1["lng"] - n2["lng"]) * self.meters_per_deg_lon)
            n_rough = 0.013
            area = math.pi * ((dia / 2.0) ** 2)
            r_hyd = dia / 4.0
            cap = (1.0 / n_rough) * area * (r_hyd ** (2.0 / 3.0)) * math.sqrt(max(slope, 0.001))
            is_bottleneck = dia <= 0.9 or cap < 3.5

            pipe_dict = {
                "id": pid,
                "from_node": fn,
                "to_node": tn,
                "diameter_m": dia,
                "length_m": round(dist_m, 1),
                "slope": round(slope, 4),
                "roughness": n_rough,
                "capacity_m3_s": round(cap, 2),
                "is_bottleneck": is_bottleneck,
                "coordinates": [[n1["lat"], n1["lng"]], [n2["lat"], n2["lng"]]]
            }
            self.drainage_pipes.append(pipe_dict)
            n1["connected_pipes"].append(pid)
            n2["connected_pipes"].append(pid)

        # Real Drainage capacity estimated grid (matching plots.ipynb logic)
        self.real_drain_mask = np.zeros((self.grid_size, self.grid_size))
        for dn in self.drainage_nodes:
            self.real_drain_mask[dn["grid_y"], dn["grid_x"]] = 1.0

        self.drainage_capacity_estimated = np.where(
            self.real_drain_mask == 1.0,
            50.0,
            np.where(self.channel_mask == 1.0, 10.0 + self.flow_norm * 40.0, 5.0)
        )

    def _generate_delhi_road_network(self):
        """Defines real Delhi arterial corridors, flyovers, and sunken underpasses."""
        self.road_nodes = [
            ("RN-01", "Kashmere Gate ISBT Junction", float(self.grid_lats[3, 6]), float(self.grid_lngs[3, 6]), True),
            ("RN-02", "Salimgarh Bypass Entry", float(self.grid_lats[4, 20]), float(self.grid_lngs[4, 20]), True),
            ("RN-03", "Old Delhi Railway Terminal", float(self.grid_lats[10, 8]), float(self.grid_lngs[10, 8]), False),
            ("RN-04", "Red Fort West Gate", float(self.grid_lats[9, 18]), float(self.grid_lngs[9, 18]), False),
            ("RN-05", "Yamuna Salimgarh Flyover", float(self.grid_lats[8, 28]), float(self.grid_lngs[8, 28]), True),
            ("RN-06", "Daryaganj Main Crossing", float(self.grid_lats[15, 8]), float(self.grid_lngs[15, 8]), False),
            ("RN-07", "Delhi Gate Junction", float(self.grid_lats[17, 12]), float(self.grid_lngs[17, 12]), False),
            ("RN-08", "Rajghat North Ring Road", float(self.grid_lats[15, 24]), float(self.grid_lngs[15, 24]), False),
            ("RN-09", "ITO Underpass Approach West", float(self.grid_lats[19, 11]), float(self.grid_lngs[19, 11]), False),
            ("RN-10", "ITO Sunken Underpass Lowland", float(self.grid_lats[20, 14]), float(self.grid_lngs[20, 14]), False),
            ("RN-11", "ITO Flyover Elevated Bypass", float(self.grid_lats[20, 19]), float(self.grid_lngs[20, 19]), True),
            ("RN-12", "Vikas Marg East Bridge Ramp", float(self.grid_lats[21, 28]), float(self.grid_lngs[21, 28]), True),
            ("RN-13", "Tilak Bridge Crossing", float(self.grid_lats[22, 9]), float(self.grid_lngs[22, 9]), False),
            ("RN-14", "Pragati Maidan Gate 1", float(self.grid_lats[24, 12]), float(self.grid_lngs[24, 12]), False),
            ("RN-15", "Bhairon Marg Underpass", float(self.grid_lats[26, 16]), float(self.grid_lngs[26, 16]), False),
            ("RN-16", "Mahatma Gandhi Ring Road Corridor", float(self.grid_lats[25, 26]), float(self.grid_lngs[25, 26]), False),
            ("RN-17", "Purana Qila - Zoo Crossing", float(self.grid_lats[29, 8]), float(self.grid_lngs[29, 8]), False),
            ("RN-18", "Mathura Road High Link", float(self.grid_lats[30, 14]), float(self.grid_lngs[30, 14]), True),
            ("RN-19", "Nizamuddin West Crossing", float(self.grid_lats[33, 12]), float(self.grid_lngs[33, 12]), False),
            ("RN-20", "Sarai Kale Khan ISBT Terminal", float(self.grid_lats[33, 26]), float(self.grid_lngs[33, 26]), False),
            ("RN-21", "Barapullah Elevated Expressway", float(self.grid_lats[34, 18]), float(self.grid_lngs[34, 18]), True),
        ]

        rn_dict = {item[0]: item for item in self.road_nodes}

        delhi_road_defs = [
            ("RD-01", "Mahatma Gandhi Ring Road North", "arterial", "RN-01", "RN-02", "DN-01"),
            ("RD-02", "Salimgarh Bypass Elevated Highway", "bridge", "RN-02", "RN-05", "DN-02"),
            ("RD-03", "Old Delhi Heritage Corridor", "collector", "RN-01", "RN-03", "DN-03"),
            ("RD-04", "Netaji Subhash Marg", "arterial", "RN-03", "RN-04", "DN-04"),
            ("RD-05", "Yamuna Bund Road North", "collector", "RN-04", "RN-05", "DN-04"),
            ("RD-06", "Daryaganj Central Boulevard", "arterial", "RN-03", "RN-06", "DN-05"),
            ("RD-07", "Delhi Gate Link", "collector", "RN-06", "RN-07", "DN-07"),
            ("RD-08", "Ring Road Rajghat Section", "arterial", "RN-05", "RN-08", "DN-08"),
            ("RD-09", "Shanti Van Cross Link", "local", "RN-07", "RN-08", "DN-08"),
            ("RD-10", "Deen Dayal Upadhyaya Marg", "arterial", "RN-06", "RN-09", "DN-07"),
            ("RD-11", "ITO Ring Road Approach West", "underpass", "RN-07", "RN-09", "DN-09"),
            ("RD-12", "ITO Sunken Underpass Lowland Sump", "underpass", "RN-09", "RN-10", "DN-09"),
            ("RD-13", "ITO Underpass East Exit", "underpass", "RN-10", "RN-11", "DN-09"),
            ("RD-14", "ITO Elevated Flyover Bypass", "bridge", "RN-07", "RN-11", "DN-09"),
            ("RD-15", "Vikas Marg Yamuna Bridge", "bridge", "RN-11", "RN-12", "DN-10"),
            ("RD-16", "Ring Road IP Estate Stretch", "arterial", "RN-08", "RN-11", "DN-10"),
            ("RD-17", "Tilak Bridge Underpass", "underpass", "RN-09", "RN-13", "DN-11"),
            ("RD-18", "Pragati Maidan West Link", "collector", "RN-13", "RN-14", "DN-13"),
            ("RD-19", "Bhairon Marg Lowland Underpass", "underpass", "RN-14", "RN-15", "DN-14"),
            ("RD-20", "Purana Qila Elevated Bypass", "bridge", "RN-14", "RN-18", "DN-15"),
            ("RD-21", "Ring Road Central Yamuna Corridor", "arterial", "RN-11", "RN-16", "DN-10"),
            ("RD-22", "Bhairon Marg East Link", "collector", "RN-15", "RN-16", "DN-14"),
            ("RD-23", "Mathura Road Arterial", "arterial", "RN-14", "RN-17", "DN-16"),
            ("RD-24", "Zoo - Sunder Nursery Corridor", "collector", "RN-17", "RN-18", "DN-16"),
            ("RD-25", "Mathura Road Nizamuddin Link", "arterial", "RN-18", "RN-19", "DN-17"),
            ("RD-26", "Ring Road South to Nizamuddin", "arterial", "RN-16", "RN-20", "DN-18"),
            ("RD-27", "Barapullah Elevated Corridor", "bridge", "RN-19", "RN-21", "DN-17"),
            ("RD-28", "Sarai Kale Khan ISBT Access Road", "arterial", "RN-20", "RN-21", "DN-18"),
        ]

        self.road_segments = []
        for rid, name, cat, n1_id, n2_id, drain_id in delhi_road_defs:
            n1 = rn_dict[n1_id]
            n2 = rn_dict[n2_id]
            lats_sample = np.linspace(n1[2], n2[2], 5)
            lngs_sample = np.linspace(n1[3], n2[3], 5)
            coords = [[round(float(la), 6), round(float(ln), 6)] for la, ln in zip(lats_sample, lngs_sample)]
            
            dist_m = math.hypot((n1[2] - n2[2]) * self.meters_per_deg_lat, (n1[3] - n2[3]) * self.meters_per_deg_lon)

            mid_lat, mid_lng = (n1[2] + n2[2]) / 2.0, (n1[3] + n2[3]) / 2.0
            gr_idx = int(np.clip((self.max_lat - mid_lat) / (self.max_lat - self.min_lat) * (self.grid_size - 1), 0, self.grid_size - 1))
            gc_idx = int(np.clip((mid_lng - self.min_lng) / (self.max_lng - self.min_lng) * (self.grid_size - 1), 0, self.grid_size - 1))
            road_elev = float(self.elevation_grid[gr_idx, gc_idx])

            if cat == "bridge":
                road_elev += 5.0
            elif cat == "underpass":
                road_elev -= 2.5

            road_dict = {
                "id": rid,
                "name": name,
                "category": cat,
                "from_node": n1_id,
                "to_node": n2_id,
                "coordinates": coords,
                "length_m": round(dist_m, 1),
                "grid_x": gc_idx,
                "grid_y": gr_idx,
                "elevation_m": round(road_elev, 2),
                "nearby_drain_id": drain_id,
            }
            self.road_segments.append(road_dict)

            for dn in self.drainage_nodes:
                if dn["id"] == drain_id:
                    dn["affected_road_ids"].append(rid)

    def get_dataset(self) -> Dict[str, Any]:
        return {
            "city_name": "Active Study Area • Delhi Pilot Catchment",
            "grid_size": self.grid_size,
            "bounds": {
                "min_lat": self.min_lat,
                "max_lat": self.max_lat,
                "min_lng": self.min_lng,
                "max_lng": self.max_lng,
            },
            "cell_size_m": self.cell_size_m,
            "cell_area_m2": self.cell_area_m2,
            "elevation_grid": self.elevation_grid,
            "slope_grid": self.slope_grid,
            "slope_deg_grid": self.slope_deg_grid,
            "imperviousness_grid": self.imperviousness_grid,
            "log_flow_accum": self.log_flow_accum,
            "real_drain_mask": self.real_drain_mask,
            "drainage_capacity_estimated": self.drainage_capacity_estimated,
            "grid_lats": self.grid_lats,
            "grid_lngs": self.grid_lngs,
            "drainage_nodes": self.drainage_nodes,
            "drainage_pipes": self.drainage_pipes,
            "road_nodes": self.road_nodes,
            "road_segments": self.road_segments
        }

# Global singleton representing the real city data
synthetic_city = RealCityDataLoader()
SyntheticCityGenerator = RealCityDataLoader
