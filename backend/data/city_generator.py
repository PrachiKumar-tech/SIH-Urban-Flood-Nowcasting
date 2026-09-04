import json
import os
import math
import heapq
import numpy as np
import tifffile
from scipy import ndimage
from typing import Dict, List, Tuple, Any

RANDOM_SEED = 42

class RealCityDataLoader:
    """
    Ingests and processes real GIS data from sih_project_Data:
    1. jaipur_SRTMGL1.tif / output_SRTMGL1.tif (NASA SRTM 30m Global DEM raster of South Jaipur Catchment)
    2. imperviousness.tif (Real OpenStreetMap building/road imperviousness raster)
    3. Derives physical slope in degrees, D8 flow accumulation, and drainage capacity layers matching plots.ipynb.
    """

    def __init__(self, data_dir: str = None, grid_size: int = 36):
        if data_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "sih_project_Data")
        
        self.data_dir = data_dir
        self.grid_size = grid_size
        
        # Real Geographic Extent of South Jaipur Study Area from GeoTIFF tags
        # Covering Jawahar Circle, WTP / JLN Marg, Airport, Malviya Nagar & Sanganer
        self.min_lat = 26.800139
        self.max_lat = 26.845139
        self.min_lng = 75.804861
        self.max_lng = 75.849861
        
        center_lat = (self.min_lat + self.max_lat) / 2.0
        self.meters_per_deg_lat = 111320.0
        self.meters_per_deg_lon = 111320.0 * math.cos(math.radians(center_lat))
        
        self.cell_size_m = 138.0  # ~138 meters per grid cell
        self.cell_area_m2 = self.cell_size_m ** 2
        
        self.dem_loaded = False
        self.imp_loaded = False
        self.roads_loaded = False
        self.data_load_errors = []
        
        self.rng = np.random.RandomState(RANDOM_SEED)
        self._load_and_process_real_data()

    def _load_and_process_real_data(self):
        dem_path = None
        for cand in ["jaipur_SRTMGL1.tif", "output_SRTMGL1.tif"]:
            p = os.path.join(self.data_dir, cand)
            if os.path.exists(p):
                dem_path = p
                break
        
        imp_path = os.path.join(self.data_dir, "imperviousness.tif")

        # 1. Ingest Real DEM and Imperviousness Rasters
        if dem_path and os.path.exists(dem_path) and os.path.exists(imp_path):
            try:
                with tifffile.TiffFile(dem_path) as tif:
                    page = tif.pages[0]
                    raw_dem = page.asarray().astype(float)
                    # Parse exact GeoTIFF tiepoint and pixel scale tags if present
                    if "ModelTiepointTag" in page.tags and "ModelPixelScaleTag" in page.tags:
                        tiepoint = page.tags["ModelTiepointTag"].value
                        scale = page.tags["ModelPixelScaleTag"].value
                        raw_h, raw_w = raw_dem.shape
                        self.min_lng = float(tiepoint[3])
                        self.max_lat = float(tiepoint[4])
                        self.max_lng = float(self.min_lng + raw_w * scale[0])
                        self.min_lat = float(self.max_lat - raw_h * scale[1])

                with tifffile.TiffFile(imp_path) as tif:
                    raw_imp = tif.pages[0].asarray().astype(float)
                
                self.dem_loaded = True
                self.imp_loaded = True
                print(f"[HydroCast AI] Successfully loaded NASA SRTM DEM: {dem_path}")
                print(f"[HydroCast AI] Successfully loaded Imperviousness raster: {imp_path}")
            except Exception as e:
                err_msg = f"Error reading TIFF rasters ({e})"
                self.data_load_errors.append(err_msg)
                print(f"[CRITICAL ERROR] {err_msg}")
                raw_dem = np.full((162, 162), 380.0)
                raw_imp = np.zeros((162, 162))
        else:
            missing = []
            if not dem_path or not os.path.exists(dem_path or ""):
                missing.append("jaipur_SRTMGL1.tif")
            if not os.path.exists(imp_path):
                missing.append("imperviousness.tif")
            err_msg = f"Missing required GeoTIFF data files in {self.data_dir}: {', '.join(missing)}"
            self.data_load_errors.append(err_msg)
            print(f"[CRITICAL ERROR] {err_msg}")
            # Fallback placeholder if files missing
            raw_dem = np.full((162, 162), 380.0)
            raw_imp = np.zeros((162, 162))

        raw_h, raw_w = raw_dem.shape
        center_lat = (self.min_lat + self.max_lat) / 2.0
        self.meters_per_deg_lat = 111320.0
        self.meters_per_deg_lon = 111320.0 * math.cos(math.radians(center_lat))

        # 2. Resample / Interpolate to unified simulation grid
        elev_grid = ndimage.zoom(raw_dem, (self.grid_size / raw_h, self.grid_size / raw_w), order=1)
        imp_grid = ndimage.zoom(raw_imp, (self.grid_size / raw_h, self.grid_size / raw_w), order=1)
        self.elevation_grid = elev_grid
        self.imperviousness_grid = np.clip(imp_grid, 0.0, 1.0)

        # 3. Create Coordinates Meshgrid
        lats = np.linspace(self.max_lat, self.min_lat, self.grid_size)
        lngs = np.linspace(self.min_lng, self.max_lng, self.grid_size)
        self.grid_lats, self.grid_lngs = np.meshgrid(lats, lngs, indexing='ij')

        # 4. Compute Physical Slope in Degrees matching plots.ipynb
        cellsize_x_m = ((self.max_lng - self.min_lng) / self.grid_size) * self.meters_per_deg_lon
        cellsize_y_m = ((self.max_lat - self.min_lat) / self.grid_size) * self.meters_per_deg_lat
        self.cell_size_m = round((cellsize_x_m + cellsize_y_m) / 2.0, 1)
        self.cell_area_m2 = cellsize_x_m * cellsize_y_m
        
        dzdy, dzdx = np.gradient(self.elevation_grid, cellsize_y_m, cellsize_x_m)
        slope_tan = np.sqrt(dzdx**2 + dzdy**2)
        self.slope_grid = np.clip(slope_tan, 0.0001, 0.35)
        self.slope_deg_grid = np.degrees(np.arctan(self.slope_grid))

        # 5. Compute Flow Accumulation log(1 + acc) and Drainage Channels
        self._compute_topographic_flow()

        # 6. Generate Realistic City Infrastructure for South Jaipur Catchment
        self._generate_jaipur_drainage_network()
        self._generate_jaipur_road_network()

    def _compute_topographic_flow(self):
        """Computes depression-resolved flow direction, accumulation, and channels matching plots.ipynb."""
        h, w = self.grid_size, self.grid_size
        filled = self.elevation_grid.copy()
        visited = np.zeros((h, w), dtype=bool)
        pq = []

        # Priority-flood pit filling
        for r in range(h):
            for c in range(w):
                if r == 0 or r == h - 1 or c == 0 or c == w - 1:
                    heapq.heappush(pq, (filled[r, c], r, c))
                    visited[r, c] = True

        dr = [-1, -1, -1, 0, 0, 1, 1, 1]
        dc = [-1, 0, 1, -1, 1, -1, 0, 1]

        while pq:
            elev, r, c = heapq.heappop(pq)
            for i in range(8):
                nr, nc = r + dr[i], c + dc[i]
                if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc]:
                    visited[nr, nc] = True
                    if filled[nr, nc] < elev:
                        filled[nr, nc] = elev
                    heapq.heappush(pq, (filled[nr, nc], nr, nc))

        # D8 Flow Direction & Flow Accumulation
        flow_dir = np.full((h, w), -1, dtype=int)
        for r in range(h):
            for c in range(w):
                min_elev = filled[r, c]
                best_dir = -1
                for i in range(8):
                    nr, nc = r + dr[i], c + dc[i]
                    if 0 <= nr < h and 0 <= nc < w:
                        dist = 1.414 if (dr[i] != 0 and dc[i] != 0) else 1.0
                        drop = (filled[r, c] - filled[nr, nc]) / dist
                        if drop > 0 and filled[nr, nc] < min_elev:
                            min_elev = filled[nr, nc]
                            best_dir = i
                flow_dir[r, c] = best_dir

        order = np.lexsort((np.arange(w)[None, :].repeat(h, axis=0).flatten(),
                            np.arange(h)[:, None].repeat(w, axis=1).flatten(),
                            -filled.flatten()))
        acc = np.ones((h, w), dtype=float)
        for idx in order:
            r = idx // w
            c = idx % w
            d = flow_dir[r, c]
            if d != -1:
                tr, tc = r + dr[d], c + dc[d]
                acc[tr, tc] += acc[r, c]

        self.flow_accum = acc
        self.log_flow_accum = np.log1p(acc)
        flow_min, flow_max = np.min(self.log_flow_accum), np.max(self.log_flow_accum)
        self.flow_norm = (self.log_flow_accum - flow_min) / (flow_max - flow_min + 1e-9)
        channel_thresh = min(4.0, float(np.percentile(self.log_flow_accum, 85)))
        self.channel_mask = (self.log_flow_accum >= channel_thresh).astype(float)

    def _generate_jaipur_drainage_network(self):
        """Defines real South Jaipur / Dravyavati storm drains, sumps and outfalls."""
        self.drainage_nodes: List[Dict[str, Any]] = []
        self.drainage_pipes: List[Dict[str, Any]] = []

        jaipur_node_defs = [
            ("DN-01", "Jawahar Circle North Collector", 4, 6, 6.0, False),
            ("DN-02", "JLN Marg Central Drainage Trunk", 5, 14, 6.5, False),
            ("DN-03", "World Trade Park (WTP) Underpass Sump", 8, 8, 2.2, False),
            ("DN-04", "Malviya Nagar Sector 1 Conduit", 9, 18, 5.5, False),
            ("DN-05", "Gaurav Tower Commercial Outflow", 12, 9, 4.8, False),
            ("DN-06", "Calgiri Hospital Lowland Basin", 13, 16, 4.0, False),
            ("DN-07", "Apex Circle Storm Manhole", 16, 12, 5.2, False),
            ("DN-08", "Jhalana Safari Ridge Channel", 15, 25, 7.0, False),
            ("DN-09", "B2 Bypass Sunken Underpass Sump", 19, 6, 2.0, False),
            ("DN-10", "Airport Terminal 2 Sump", 20, 11, 2.4, False),
            ("DN-11", "Tonk Road Arterial Interceptor", 22, 8, 6.0, False),
            ("DN-12", "Dravyavati River Inflow Gate 1", 21, 18, 8.5, False),
            ("DN-13", "Jagatpura Railway Underpass Sump", 24, 24, 1.8, False),
            ("DN-14", "SKIT Institutional Collector", 26, 28, 4.5, False),
            ("DN-15", "Sanganer Main Bazaar Drain", 28, 10, 3.5, False),
            ("DN-16", "Dravyavati River Central Basin", 28, 18, 9.0, False),
            ("DN-17", "Pratap Nagar Sector 8 Low Basin Sump", 31, 12, 2.2, False),
            ("DN-18", "Mahal Road Storm Conduit", 32, 26, 6.5, False),
            ("DN-19", "Dravyavati Check Dam Outfall A", 16, 33, 20.0, True),
            ("DN-20", "Dravyavati River Main Outfall B", 26, 33, 25.0, True),
            ("DN-21", "Sanganer South Floodway Outfall C", 34, 33, 22.0, True),
        ]

        node_map = {}
        for nid, name, gr, gc, cap, is_outfall in jaipur_node_defs:
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

        jaipur_pipe_defs = [
            # Western Corridor (Jawahar Circle -> WTP -> Airport -> Sanganer -> Outfall C)
            ("DP-01", "DN-01", "DN-03", 1.4, 0.012),
            ("DP-02", "DN-03", "DN-05", 1.5, 0.010),
            ("DP-03", "DN-05", "DN-07", 1.4, 0.008),
            ("DP-04", "DN-07", "DN-09", 1.3, 0.006),
            ("DP-05", "DN-09", "DN-10", 1.6, 0.007),
            ("DP-06", "DN-10", "DN-11", 1.5, 0.006),
            ("DP-07", "DN-11", "DN-15", 1.4, 0.005),
            ("DP-08", "DN-15", "DN-17", 1.6, 0.006),
            ("DP-09", "DN-17", "DN-21", 2.2, 0.010),

            # Central Corridor (JLN Marg -> Malviya Nagar -> Dravyavati -> Outfall B)
            ("DP-10", "DN-02", "DN-04", 1.5, 0.010),
            ("DP-11", "DN-04", "DN-06", 1.4, 0.008),
            ("DP-12", "DN-06", "DN-07", 1.2, 0.006),
            ("DP-13", "DN-06", "DN-12", 1.6, 0.007),
            ("DP-14", "DN-12", "DN-16", 2.0, 0.012),
            ("DP-15", "DN-16", "DN-20", 2.5, 0.015),

            # Eastern Corridor (Jhalana -> Jagatpura -> Mahal Rd -> Outfall A)
            ("DP-16", "DN-02", "DN-08", 1.5, 0.009),
            ("DP-17", "DN-08", "DN-13", 1.4, 0.008),
            ("DP-18", "DN-13", "DN-14", 1.5, 0.007),
            ("DP-19", "DN-14", "DN-18", 1.8, 0.009),
            ("DP-20", "DN-18", "DN-19", 2.2, 0.012),

            # Cross-tie relief conduits
            ("DP-21", "DN-03", "DN-04", 1.3, 0.006),
            ("DP-22", "DN-09", "DN-12", 1.4, 0.005),
            ("DP-23", "DN-14", "DN-16", 1.5, 0.006),
            ("DP-24", "DN-16", "DN-17", 1.4, 0.005),
        ]
        for pid, fn, tn, dia, slope in jaipur_pipe_defs:
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

    def _generate_jaipur_road_network(self):
        """Defines real South Jaipur arterial corridors with real OpenStreetMap polylines."""
        roads_file = os.path.join(os.path.dirname(__file__), "final_real_roads.json")
        nodes_file = os.path.join(os.path.dirname(__file__), "final_road_nodes.json")

        if os.path.exists(roads_file) and os.path.exists(nodes_file):
            try:
                with open(roads_file, "r", encoding="utf-8") as f:
                    raw_roads = json.load(f)
                with open(nodes_file, "r", encoding="utf-8") as f:
                    self.road_nodes = json.load(f)

                self.road_segments = []
                for r in raw_roads:
                    self.road_segments.append({
                        "id": r["road_id"],
                        "name": r["name"],
                        "category": r["category"],
                        "from_node": r["from_node"],
                        "to_node": r["to_node"],
                        "coordinates": r["coords"],
                        "length_m": r["length_m"],
                        "grid_x": r["grid_x"],
                        "grid_y": r["grid_y"],
                        "elevation_m": r["elevation_m"],
                        "nearby_drain_id": r["nearby_drain_id"],
                    })

                    for dn in self.drainage_nodes:
                        if dn["id"] == r["nearby_drain_id"]:
                            dn["affected_road_ids"].append(r["road_id"])
                
                self.roads_loaded = True
                print(f"[HydroCast AI] Successfully loaded {len(self.road_segments)} OpenStreetMap arterial corridors from {roads_file}")
            except Exception as e:
                err_msg = f"Error reading road network JSON ({e})"
                self.data_load_errors.append(err_msg)
                print(f"[CRITICAL ERROR] {err_msg}")
                self.road_nodes = []
                self.road_segments = []
        else:
            err_msg = f"Road network JSON files missing: {roads_file} or {nodes_file}"
            self.data_load_errors.append(err_msg)
            print(f"[CRITICAL ERROR] {err_msg}")
            self.road_nodes = []
            self.road_segments = []

    def get_dataset(self) -> Dict[str, Any]:
        return {
            "city_name": "Active Study Area • South Jaipur (Jawahar Circle & Malviya Nagar Catchment)",
            "grid_size": self.grid_size,
            "bounds": {
                "min_lat": self.min_lat,
                "max_lat": self.max_lat,
                "min_lng": self.min_lng,
                "max_lng": self.max_lng,
            },
            "elevation_min_m": float(self.elevation_grid.min()),
            "elevation_max_m": float(self.elevation_grid.max()),
            "road_segments_count": len(self.road_segments),
            "drainage_nodes_count": len(self.drainage_nodes),
            "drainage_pipes_count": len(self.drainage_pipes)
        }

# Global loaded city instance
synthetic_city = RealCityDataLoader()
CityDataLoader = RealCityDataLoader
SyntheticCityGenerator = RealCityDataLoader
