import numpy as np
from typing import List, Dict, Tuple, Any
from ..models.schemas import RainfallGridPoint, RainfallForecastStep, RainfallNowcastResponse
from ..data.city_generator import synthetic_city

class RainfallNowcaster:
    """
    Spatial-temporal convective storm nowcast engine (0 to 180 min).
    Models a moving high-intensity storm cell across the South Jaipur catchment
    with Gaussian spatial dispersion and user-configurable intensity multipliers.
    """

    HORIZONS = [0, 30, 60, 90, 120, 180]
    BASE_INTENSITIES = {
        0: 45.0,
        30: 65.0,
        60: 85.0,
        90: 102.6,
        120: 75.0,
        180: 35.0,
    }

    CUMULATIVE_SCHEDULE = {
        0: 45.0,
        30: 65.0,
        60: 85.0,
        90: 102.6,
        120: 110.0,
        180: 95.0
    }

    def __init__(self, city_data=synthetic_city):
        self.city = city_data
        self.grid_size = city_data.grid_size
        self.lats = city_data.grid_lats
        self.lngs = city_data.grid_lngs

    def _get_storm_center(self, time_min: int) -> Tuple[float, float]:
        """Storm cell moves from North-West (Civil Lines) towards South-East (ITO/Nizamuddin)."""
        progress = min(max(time_min / 180.0, 0.0), 1.0)
        center_r = 6.0 + 22.0 * progress
        center_c = 6.0 + 22.0 * progress
        return center_r, center_c

    def get_rainfall_grid_2d(self, time_offset_min: int, multiplier: float = 1.0) -> Tuple[np.ndarray, np.ndarray]:
        t = float(time_offset_min)
        if t in self.BASE_INTENSITIES:
            base_rain = self.BASE_INTENSITIES[int(t)]
        else:
            h_keys = sorted(self.BASE_INTENSITIES.keys())
            if t <= h_keys[0]:
                base_rain = self.BASE_INTENSITIES[h_keys[0]]
            elif t >= h_keys[-1]:
                base_rain = self.BASE_INTENSITIES[h_keys[-1]]
            else:
                for i in range(len(h_keys) - 1):
                    if h_keys[i] <= t <= h_keys[i+1]:
                        frac = (t - h_keys[i]) / (h_keys[i+1] - h_keys[i])
                        base_rain = (1 - frac) * self.BASE_INTENSITIES[h_keys[i]] + frac * self.BASE_INTENSITIES[h_keys[i+1]]
                        break

        cr, cc = self._get_storm_center(time_offset_min)
        sigma = 9.0

        r_coords = np.arange(self.grid_size)[:, None]
        c_coords = np.arange(self.grid_size)[None, :]
        dist_sq = (r_coords - cr)**2 + (c_coords - cc)**2
        spatial_factor = 0.35 + 1.30 * np.exp(- dist_sq / (2 * (sigma**2)))

        intensity_grid = base_rain * spatial_factor * multiplier
        intensity_grid = np.clip(intensity_grid, 0.0, 250.0)

        # Active cloudburst storm cumulative accumulation (matching plots.ipynb August 1 event)
        if int(t) in self.CUMULATIVE_SCHEDULE:
            cum_base = self.CUMULATIVE_SCHEDULE[int(t)]
        else:
            h_keys = sorted(self.CUMULATIVE_SCHEDULE.keys())
            if t <= h_keys[0]:
                cum_base = self.CUMULATIVE_SCHEDULE[h_keys[0]]
            elif t >= h_keys[-1]:
                cum_base = self.CUMULATIVE_SCHEDULE[h_keys[-1]]
            else:
                for i in range(len(h_keys) - 1):
                    if h_keys[i] <= t <= h_keys[i+1]:
                        frac = (t - h_keys[i]) / (h_keys[i+1] - h_keys[i])
                        cum_base = (1 - frac) * self.CUMULATIVE_SCHEDULE[h_keys[i]] + frac * self.CUMULATIVE_SCHEDULE[h_keys[i+1]]
                        break

        cumulative_grid = np.clip(cum_base * spatial_factor * multiplier, 0.0, 350.0)

        return intensity_grid, cumulative_grid

    def get_forecast_response(self, current_time_min: int = 0, multiplier: float = 1.0) -> RainfallNowcastResponse:
        forecast_steps = []
        for step_min in self.HORIZONS:
            intensity_2d, cum_2d = self.get_rainfall_grid_2d(step_min, multiplier)
            grid_points = []

            for r in range(self.grid_size):
                for c in range(self.grid_size):
                    grid_points.append(RainfallGridPoint(
                        id=f"rain_{r}_{c}",
                        lat=round(float(self.lats[r, c]), 6),
                        lng=round(float(self.lngs[r, c]), 6),
                        grid_x=c,
                        grid_y=r,
                        intensity_mm_hr=round(float(intensity_2d[r, c]), 2),
                        cumulative_rain_mm=round(float(cum_2d[r, c]), 2)
                    ))

            forecast_steps.append(RainfallForecastStep(
                time_offset_min=step_min,
                time_label=f"T+{step_min} min",
                mean_intensity_mm_hr=round(float(np.mean(intensity_2d)), 2),
                max_intensity_mm_hr=round(float(np.max(intensity_2d)), 2),
                grid=grid_points
            ))

        return RainfallNowcastResponse(
            scenario_name="South Jaipur Monsoon Cloudburst Scenario",
            current_time_offset_min=current_time_min,
            multiplier=multiplier,
            forecast_steps=forecast_steps
        )

rainfall_nowcaster = RainfallNowcaster()
