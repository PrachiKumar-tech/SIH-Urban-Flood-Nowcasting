import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  FloodMapResponse,
  DrainageStatusResponse,
  RoadStatusResponse,
  RouteResponse,
  RoadSegment,
  DrainageNode
} from '../types';
import { LayerVisibility } from '../components/LayerControl';

interface FloodMapProps {
  floodMap: FloodMapResponse | null;
  drainageStatus: DrainageStatusResponse | null;
  roadStatus: RoadStatusResponse | null;
  routeResult: RouteResponse | null;
  layers: LayerVisibility;
  onSelectRoad: (road: RoadSegment) => void;
  onSelectDrainNode: (node: DrainageNode) => void;
  timeOffsetMin: number;
}

export const FloodMap: React.FC<FloodMapProps> = ({
  floodMap,
  drainageStatus,
  roadStatus,
  routeResult,
  layers,
  onSelectRoad,
  onSelectDrainNode,
  timeOffsetMin
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{
    floodDepth: L.LayerGroup;
    roads: L.LayerGroup;
    rainfallRadar: L.LayerGroup;
    drainage: L.LayerGroup;
    elevation: L.LayerGroup;
    probability: L.LayerGroup;
    hotspots: L.LayerGroup;
    routes: L.LayerGroup;
  }>({
    floodDepth: L.layerGroup(),
    roads: L.layerGroup(),
    rainfallRadar: L.layerGroup(),
    drainage: L.layerGroup(),
    elevation: L.layerGroup(),
    probability: L.layerGroup(),
    hotspots: L.layerGroup(),
    routes: L.layerGroup(),
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on South Jaipur Pilot Catchment / Jawahar Circle - Malviya Nagar - Airport Corridor (26.8225° N, 75.8275° E)
    const centerLat = 26.8225;
    const centerLng = 75.8275;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // Google Maps Roadmap style basemap (Cleaned: POIs, shops, and transit icons hidden; roads, rivers, and areas preserved)
    const baseLayer = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=m&apistyle=s.t:2|p.v:off,s.t:4|s.e:l.i|p.v:off&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>',
      }
    );

    // Graceful fallback to OpenStreetMap if ever needed
    baseLayer.on('tileerror', () => {
      console.warn('Google Maps tile error. Falling back to OpenStreetMap.');
      const fallbackLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      fallbackLayer.addTo(map);
    });

    baseLayer.addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const lg = layerGroupsRef.current;
    lg.elevation.addTo(map);
    lg.floodDepth.addTo(map);
    lg.drainage.addTo(map);
    lg.roads.addTo(map);
    lg.rainfallRadar.addTo(map);
    lg.probability.addTo(map);
    lg.hotspots.addTo(map);
    lg.routes.addTo(map);

    mapInstanceRef.current = map;

    // Handle container resize automatically
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Flood Depth Grid & Elevation Layers
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.floodDepth.clearLayers();
    lg.elevation.clearLayers();
    lg.probability.clearLayers();

    if (!floodMap) return;

    // Geographic cell delta for seamless tile coverage (South Jaipur: 45 milli-deg lat & 45 milli-deg lng)
    const dLat = 0.045000 / 36 / 2.0;
    const dLng = 0.045000 / 36 / 2.0;

    if (layers.floodDepth || layers.elevationDEM || layers.floodProbability) {
      floodMap.cells.forEach((cell) => {
        const bounds: L.LatLngBoundsExpression = [
          [cell.lat - dLat, cell.lng - dLng],
          [cell.lat + dLat, cell.lng + dLng],
        ];

        // 1. Flood Depth Layer (Renders data-backed depth >= 0.1 cm matching plots.ipynb)
        if (layers.floodDepth && cell.water_depth_cm >= 0.1) {
          let fillColor = '#38bdf8';
          let fillOpacity = 0.32;

          if (cell.water_depth_cm >= 25.0) {
            fillColor = '#dc2626'; // Deep Red - Critical Inundation
            fillOpacity = 0.72;
          } else if (cell.water_depth_cm >= 10.0) {
            fillColor = '#ea580c'; // Orange - Moderate to High Flood
            fillOpacity = 0.58;
          } else if (cell.water_depth_cm >= 2.0) {
            fillColor = '#ca8a04'; // Amber - Curb Level Ponding / Watch
            fillOpacity = 0.44;
          }

          const rect = L.rectangle(bounds, {
            color: fillColor,
            weight: 0.5,
            opacity: 0.45,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
          });
          rect.bindTooltip(
            `<div class="space-y-1 text-slate-100 text-xs">
              <div class="font-bold text-white">Grid Cell (${cell.grid_y}, ${cell.grid_x})</div>
              <div>Water Depth: <span style="color:${fillColor}; font-weight:700">${cell.water_depth_cm.toFixed(1)} cm</span></div>
              <div class="text-slate-300">DEM Elevation: ${cell.elevation_m.toFixed(1)} m MSL</div>
              <div class="text-slate-300">Imperviousness: ${(cell.imperviousness * 100).toFixed(0)}%</div>
              <div class="text-slate-300">Rainfall: ${cell.rainfall_intensity_mm_hr} mm/h</div>
            </div>`,
            { sticky: true }
          );
          rect.addTo(lg.floodDepth);
        }

        // 2. DEM Elevation Layer (Normalized for South Jaipur: 354m to 438m MSL)
        if (layers.elevationDEM) {
          const normElev = Math.min(Math.max((cell.elevation_m - 354.0) / 84.0, 0), 1);
          const hue = 210 - normElev * 150;
          const elevColor = `hsl(${hue}, 65%, 45%)`;

          const elevRect = L.rectangle(bounds, {
            color: elevColor,
            weight: 0.3,
            opacity: 0.3,
            fillColor: elevColor,
            fillOpacity: 0.35,
          });
          elevRect.bindTooltip(`Elevation: <strong>${cell.elevation_m.toFixed(1)} m MSL</strong>`, { sticky: true });
          elevRect.addTo(lg.elevation);
        }

        // 3. Flood Probability Layer
        if (layers.floodProbability && cell.flood_probability > 0.15) {
          const probColor = cell.flood_probability > 0.7 ? '#dc2626' : cell.flood_probability > 0.4 ? '#ea580c' : '#ca8a04';
          const probRect = L.rectangle(bounds, {
            color: probColor,
            weight: 0.5,
            opacity: 0.4,
            fillColor: probColor,
            fillOpacity: cell.flood_probability * 0.48,
          });
          probRect.bindTooltip(`Flood Probability: <strong>${(cell.flood_probability * 100).toFixed(0)}%</strong>`, { sticky: true });
          probRect.addTo(lg.probability);
        }
      });
    }
  }, [floodMap, layers.floodDepth, layers.elevationDEM, layers.floodProbability]);

  // Update Rainfall Radar Heatmap (Simulated Nowcast)
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.rainfallRadar.clearLayers();

    if (!layers.rainfallRadar || !floodMap) return;

    const progress = Math.min(Math.max(timeOffsetMin / 180, 0), 1);
    const stormLat = 26.840 - 0.030 * progress;
    const stormLng = 75.815 + 0.025 * progress;

    L.circle([stormLat, stormLng], {
      radius: 1200,
      color: '#dc2626',
      weight: 1.5,
      fillColor: '#dc2626',
      fillOpacity: 0.22,
    }).addTo(lg.rainfallRadar);

    L.circle([stormLat, stormLng], {
      radius: 2200,
      color: '#ea580c',
      weight: 1.2,
      fillColor: '#ea580c',
      fillOpacity: 0.14,
    }).addTo(lg.rainfallRadar);

    L.circle([stormLat, stormLng], {
      radius: 3500,
      color: '#0284c7',
      weight: 1,
      fillColor: '#0284c7',
      fillOpacity: 0.08,
    }).addTo(lg.rainfallRadar);
  }, [floodMap, layers.rainfallRadar, timeOffsetMin]);

  // Update Drainage Network
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.drainage.clearLayers();

    if (!layers.drainageNetwork || !drainageStatus) return;

    drainageStatus.pipes.forEach((pipe) => {
      const isSurcharged = pipe.utilization_pct >= 100;
      const pipeColor = isSurcharged ? '#dc2626' : pipe.utilization_pct > 75 ? '#d97706' : '#0284c7';
      const weight = isSurcharged ? 3.5 : 2.5;

      const polyline = L.polyline(pipe.coordinates, {
        color: pipeColor,
        weight: weight,
        opacity: 0.95,
        dashArray: isSurcharged ? undefined : '5, 5',
      });

      polyline.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-white">Pipe ${pipe.id} (${pipe.diameter_m}m &Oslash;)</div>
          <div class="text-slate-300">Flow: ${pipe.current_flow_m3_s} / ${pipe.capacity_m3_s} m³/s</div>
          <div>Capacity Load: <strong style="color:${pipeColor}">${pipe.utilization_pct}%</strong></div>
        </div>`,
        { sticky: true }
      );
      polyline.addTo(lg.drainage);
    });

    drainageStatus.nodes.forEach((node) => {
      const isSurcharged = node.is_surcharged;
      const nodeColor = isSurcharged ? '#dc2626' : '#059669';

      const circleMarker = L.circleMarker([node.lat, node.lng], {
        radius: isSurcharged ? 7 : 5,
        color: '#ffffff',
        weight: 2,
        fillColor: nodeColor,
        fillOpacity: 1.0,
      });

      if (isSurcharged) {
        L.circleMarker([node.lat, node.lng], {
          radius: 13,
          color: '#dc2626',
          weight: 1.5,
          fillColor: '#dc2626',
          fillOpacity: 0.25,
        }).addTo(lg.drainage);
      }

      circleMarker.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-white">${node.name} (${node.id})</div>
          <div>State: <span style="color:${nodeColor}; font-weight:700">${isSurcharged ? 'SURCHARGED (OVERFLOW)' : 'NORMAL CAPACITY'}</span></div>
          <div class="text-slate-300">Inflow: ${node.inflow_m3_s} m³/s | Cap: ${node.current_capacity_m3_s} m³/s</div>
          <div class="text-cyan-400 text-[10px]">Click for node telemetry</div>
        </div>`,
        { sticky: true }
      );

      circleMarker.on('click', () => onSelectDrainNode(node));
      circleMarker.addTo(lg.drainage);
    });
  }, [drainageStatus, layers.drainageNetwork]);

  // Update Road Segments
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.roads.clearLayers();

    if (!layers.roads || !roadStatus) return;

    roadStatus.roads.forEach((road) => {
      let roadColor = '#059669';
      let weight = 3.5;

      if (road.status === 'CLOSED') {
        roadColor = '#dc2626';
        weight = 5.5;
      } else if (road.status === 'RESTRICTED') {
        roadColor = '#ea580c';
        weight = 4.5;
      } else if (road.status === 'CAUTION') {
        roadColor = '#d97706';
        weight = 4;
      }

      const polyline = L.polyline(road.coordinates, {
        color: roadColor,
        weight: weight,
        opacity: 0.95,
      });

      polyline.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-white">${road.name} (${road.id})</div>
          <div>Water Depth: <strong style="color:${roadColor}">${road.current_depth_cm.toFixed(1)} cm</strong></div>
          <div class="text-slate-300">Status: <strong>${road.status}</strong></div>
          <div class="text-cyan-400 text-[10px]">Click for emergency advisory</div>
        </div>`,
        { sticky: true }
      );

      polyline.on('click', () => onSelectRoad(road));
      polyline.addTo(lg.roads);
    });
  }, [roadStatus, layers.roads]);

  // Update Critical Hotspots
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.hotspots.clearLayers();

    if (!layers.hotspots || !floodMap) return;

    floodMap.hotspots.forEach((hs) => {
      const hsColor = hs.severity === 'CRITICAL' ? '#dc2626' : hs.severity === 'FLOOD_RISK' ? '#ea580c' : '#d97706';

      L.circle([hs.lat, hs.lng], {
        radius: 140,
        color: hsColor,
        weight: 1.5,
        fillColor: hsColor,
        fillOpacity: 0.28,
      }).addTo(lg.hotspots);

      const marker = L.circleMarker([hs.lat, hs.lng], {
        radius: 7.5,
        color: '#ffffff',
        weight: 2,
        fillColor: hsColor,
        fillOpacity: 1.0,
      });

      marker.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-white">HOTSPOT: ${hs.name}</div>
          <div>Water Depth: <span style="color:${hsColor}; font-weight:700">${hs.water_depth_cm} cm</span></div>
          <div class="text-slate-300 text-[10px]">${hs.description}</div>
        </div>`,
        { sticky: true }
      );

      marker.addTo(lg.hotspots);
    });
  }, [floodMap, layers.hotspots]);

  // Update Routes Overlay
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.routes.clearLayers();

    if (!routeResult) return;

    if (routeResult.normal_route && routeResult.normal_route.polyline.length > 0) {
      L.polyline(routeResult.normal_route.polyline, {
        color: '#dc2626',
        weight: 5,
        opacity: 0.75,
        dashArray: '6, 6',
      }).addTo(lg.routes);
    }

    if (routeResult.safe_route && routeResult.safe_route.polyline.length > 0) {
      L.polyline(routeResult.safe_route.polyline, {
        color: '#0284c7',
        weight: 7,
        opacity: 0.45,
      }).addTo(lg.routes);

      L.polyline(routeResult.safe_route.polyline, {
        color: '#0284c7',
        weight: 4,
        opacity: 1.0,
      }).addTo(lg.routes);

      const startCoord = routeResult.safe_route.polyline[0];
      const endCoord = routeResult.safe_route.polyline[routeResult.safe_route.polyline.length - 1];

      L.circleMarker(startCoord, {
        radius: 6.5,
        color: '#ffffff',
        weight: 2,
        fillColor: '#059669',
        fillOpacity: 1.0,
      }).bindTooltip('<strong>Route Origin</strong>', { permanent: false }).addTo(lg.routes);

      L.circleMarker(endCoord, {
        radius: 6.5,
        color: '#ffffff',
        weight: 2,
        fillColor: '#dc2626',
        fillOpacity: 1.0,
      }).bindTooltip('<strong>Route Destination</strong>', { permanent: false }).addTo(lg.routes);
    }
  }, [routeResult]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
