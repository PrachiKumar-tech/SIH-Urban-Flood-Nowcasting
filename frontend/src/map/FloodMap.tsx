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

    // Center on Delhi Pilot Catchment / Yamuna Corridor (28.635° N, 77.250° E)
    const centerLat = 28.6350;
    const centerLng = 77.2500;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // 1. Esri World Dark Gray Canvas Base (Free, open, zero watermark, clean dark geospatial style)
    const baseLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      }
    );

    // 2. Esri World Dark Gray Reference Layer (Crisp street names, landmarks, waterways)
    const referenceLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        pane: 'overlayPane',
        opacity: 0.85,
      }
    );

    baseLayer.addTo(map);
    referenceLayer.addTo(map);

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

    if (layers.floodDepth || layers.elevationDEM || layers.floodProbability) {
      floodMap.cells.forEach((cell) => {
        const bounds: L.LatLngBoundsExpression = [
          [cell.lat - 0.00058, cell.lng - 0.00042],
          [cell.lat + 0.00058, cell.lng + 0.00042],
        ];

        // 1. Flood Depth Layer
        if (layers.floodDepth && cell.water_depth_cm > 1.5) {
          let fillColor = '#10b981';
          let fillOpacity = 0.28;

          if (cell.water_depth_cm >= 30) {
            fillColor = '#ef4444';
            fillOpacity = 0.65;
          } else if (cell.water_depth_cm >= 15) {
            fillColor = '#f97316';
            fillOpacity = 0.50;
          } else if (cell.water_depth_cm >= 5) {
            fillColor = '#eab308';
            fillOpacity = 0.38;
          }

          const rect = L.rectangle(bounds, {
            color: fillColor,
            weight: 0.5,
            opacity: 0.3,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
          });
          rect.bindTooltip(
            `<div class="space-y-1 text-slate-100 text-xs">
              <div class="font-bold text-slate-200">Grid Cell (${cell.grid_y}, ${cell.grid_x})</div>
              <div>Water Depth: <span style="color:${fillColor}; font-weight:700">${cell.water_depth_cm.toFixed(1)} cm</span></div>
              <div class="text-slate-300">DEM Elevation: ${cell.elevation_m.toFixed(1)} m MSL</div>
              <div class="text-slate-300">Imperviousness: ${(cell.imperviousness * 100).toFixed(0)}%</div>
              <div class="text-slate-300">Rainfall: ${cell.rainfall_intensity_mm_hr} mm/h</div>
            </div>`,
            { sticky: true }
          );
          rect.addTo(lg.floodDepth);
        }

        // 2. DEM Elevation Layer
        if (layers.elevationDEM) {
          const normElev = Math.min(Math.max((cell.elevation_m - 202) / 30, 0), 1);
          const hue = 210 - normElev * 150;
          const elevColor = `hsl(${hue}, 65%, 45%)`;

          const elevRect = L.rectangle(bounds, {
            color: elevColor,
            weight: 0.3,
            opacity: 0.2,
            fillColor: elevColor,
            fillOpacity: 0.32,
          });
          elevRect.bindTooltip(`Elevation: <strong>${cell.elevation_m.toFixed(1)} m MSL</strong>`, { sticky: true });
          elevRect.addTo(lg.elevation);
        }

        // 3. Flood Probability Layer
        if (layers.floodProbability && cell.flood_probability > 0.15) {
          const probColor = cell.flood_probability > 0.7 ? '#f43f5e' : cell.flood_probability > 0.4 ? '#fb923c' : '#fde047';
          const probRect = L.rectangle(bounds, {
            color: probColor,
            weight: 0,
            fillColor: probColor,
            fillOpacity: cell.flood_probability * 0.45,
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
    const stormLat = 28.648 - 0.024 * progress;
    const stormLng = 77.240 + 0.022 * progress;

    L.circle([stormLat, stormLng], {
      radius: 1200,
      color: '#ef4444',
      weight: 1,
      fillColor: '#ef4444',
      fillOpacity: 0.20,
    }).addTo(lg.rainfallRadar);

    L.circle([stormLat, stormLng], {
      radius: 2200,
      color: '#f97316',
      weight: 1,
      fillColor: '#f97316',
      fillOpacity: 0.12,
    }).addTo(lg.rainfallRadar);

    L.circle([stormLat, stormLng], {
      radius: 3500,
      color: '#06b6d4',
      weight: 1,
      fillColor: '#06b6d4',
      fillOpacity: 0.06,
    }).addTo(lg.rainfallRadar);
  }, [floodMap, layers.rainfallRadar, timeOffsetMin]);

  // Update Drainage Network
  useEffect(() => {
    const lg = layerGroupsRef.current;
    lg.drainage.clearLayers();

    if (!layers.drainageNetwork || !drainageStatus) return;

    drainageStatus.pipes.forEach((pipe) => {
      const isSurcharged = pipe.utilization_pct >= 100;
      const pipeColor = isSurcharged ? '#ef4444' : pipe.utilization_pct > 75 ? '#f59e0b' : '#0284c7';
      const weight = isSurcharged ? 3.5 : 2;

      const polyline = L.polyline(pipe.coordinates, {
        color: pipeColor,
        weight: weight,
        opacity: 0.9,
        dashArray: isSurcharged ? undefined : '5, 5',
      });

      polyline.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-slate-200">Pipe ${pipe.id} (${pipe.diameter_m}m &Oslash;)</div>
          <div class="text-slate-300">Flow: ${pipe.current_flow_m3_s} / ${pipe.capacity_m3_s} m³/s</div>
          <div>Capacity Load: <strong style="color:${pipeColor}">${pipe.utilization_pct}%</strong></div>
        </div>`,
        { sticky: true }
      );
      polyline.addTo(lg.drainage);
    });

    drainageStatus.nodes.forEach((node) => {
      const isSurcharged = node.is_surcharged;
      const nodeColor = isSurcharged ? '#ef4444' : '#10b981';

      const circleMarker = L.circleMarker([node.lat, node.lng], {
        radius: isSurcharged ? 6.5 : 4.5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: nodeColor,
        fillOpacity: 0.95,
      });

      if (isSurcharged) {
        L.circleMarker([node.lat, node.lng], {
          radius: 12,
          color: '#ef4444',
          weight: 1,
          fillColor: '#ef4444',
          fillOpacity: 0.22,
        }).addTo(lg.drainage);
      }

      circleMarker.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-slate-200">${node.name} (${node.id})</div>
          <div>State: <span style="color:${nodeColor}; font-weight:700">${isSurcharged ? 'SURCHARGED (OVERFLOW)' : 'NORMAL GRAVITY FLOW'}</span></div>
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
      let roadColor = '#10b981';
      let weight = 3.5;

      if (road.status === 'CLOSED') {
        roadColor = '#ef4444';
        weight = 5;
      } else if (road.status === 'RESTRICTED') {
        roadColor = '#f97316';
        weight = 4.5;
      } else if (road.status === 'CAUTION') {
        roadColor = '#eab308';
        weight = 4;
      }

      const polyline = L.polyline(road.coordinates, {
        color: roadColor,
        weight: weight,
        opacity: 0.92,
      });

      polyline.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-slate-200">${road.name} (${road.id})</div>
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
      const hsColor = hs.severity === 'CRITICAL' ? '#ef4444' : hs.severity === 'FLOOD_RISK' ? '#f97316' : '#eab308';

      L.circle([hs.lat, hs.lng], {
        radius: 140,
        color: hsColor,
        weight: 1,
        fillColor: hsColor,
        fillOpacity: 0.25,
      }).addTo(lg.hotspots);

      const marker = L.circleMarker([hs.lat, hs.lng], {
        radius: 7,
        color: '#ffffff',
        weight: 1.5,
        fillColor: hsColor,
        fillOpacity: 1.0,
      });

      marker.bindTooltip(
        `<div class="space-y-1 text-slate-100 text-xs">
          <div class="font-bold text-slate-200">HOTSPOT: ${hs.name}</div>
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
        color: '#ef4444',
        weight: 5,
        opacity: 0.7,
        dashArray: '6, 6',
      }).addTo(lg.routes);
    }

    if (routeResult.safe_route && routeResult.safe_route.polyline.length > 0) {
      L.polyline(routeResult.safe_route.polyline, {
        color: '#0284c7',
        weight: 7,
        opacity: 0.4,
      }).addTo(lg.routes);

      L.polyline(routeResult.safe_route.polyline, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 1.0,
      }).addTo(lg.routes);

      const startCoord = routeResult.safe_route.polyline[0];
      const endCoord = routeResult.safe_route.polyline[routeResult.safe_route.polyline.length - 1];

      L.circleMarker(startCoord, {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 1.0,
      }).bindTooltip('<strong>Route Origin</strong>', { permanent: false }).addTo(lg.routes);

      L.circleMarker(endCoord, {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#ef4444',
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
