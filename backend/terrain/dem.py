import numpy as np
from typing import Dict, List, Tuple
from ..data.city_generator import synthetic_city

class TerrainModel:
    """
    2D DEM elevation, slope, flow direction and depression sink analysis.
    """

    def __init__(self, city_data=synthetic_city):
        self.city = city_data
        self.elevation_grid = city_data.elevation_grid
        self.slope_grid = city_data.slope_grid
        self.imperviousness_grid = city_data.imperviousness_grid
        self.grid_size = city_data.grid_size
        self._compute_flow_directions()

    def _compute_flow_directions(self):
        self.flow_target = np.full((self.grid_size, self.grid_size, 2), -1, dtype=int)
        
        neighbor_offsets = [
            (0, 1),   # E
            (1, 1),   # SE
            (1, 0),   # S
            (1, -1),  # SW
            (0, -1),  # W
            (-1, -1), # NW
            (-1, 0),  # N
            (-1, 1),  # NE
        ]

        for r in range(self.grid_size):
            for c in range(self.grid_size):
                curr_elev = self.elevation_grid[r, c]
                best_drop = 0.0
                best_neighbor = (-1, -1)

                for dr, dc in neighbor_offsets:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < self.grid_size and 0 <= nc < self.grid_size:
                        dist_factor = 1.414 if (dr != 0 and dc != 0) else 1.0
                        elev_drop = (curr_elev - self.elevation_grid[nr, nc]) / dist_factor
                        if elev_drop > best_drop:
                            best_drop = elev_drop
                            best_neighbor = (nr, nc)

                self.flow_target[r, c] = best_neighbor

    def get_elevation_stats(self) -> Dict[str, float]:
        return {
            "min_elevation_m": float(np.min(self.elevation_grid)),
            "max_elevation_m": float(np.max(self.elevation_grid)),
            "mean_elevation_m": float(np.mean(self.elevation_grid)),
            "mean_slope": float(np.mean(self.slope_grid)),
            "max_slope": float(np.max(self.slope_grid)),
        }

terrain_model = TerrainModel()
