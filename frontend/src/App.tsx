import React, { useState, useEffect } from 'react';
import {
  fetchFloodMap,
  fetchDrainageStatus,
  fetchRoadsStatus,
  fetchRainfallForecast,
  runWhatIfSimulation
} from './api/client';
import {
  FloodMapResponse,
  DrainageStatusResponse,
  RoadStatusResponse,
  RainfallNowcastResponse,
  RouteResponse,
  RoadSegment,
  DrainageNode,
  WhatIfRequest
} from './types';
import { Header } from './components/Header';
import { TimeSlider } from './components/TimeSlider';
import { StatsSidebar } from './components/StatsSidebar';
import { ChartsPanel } from './components/ChartsPanel';
import { LayerControl, LayerVisibility } from './components/LayerControl';
import { WhatIfModal } from './components/WhatIfModal';
import { RoutePlanner } from './components/RoutePlanner';
import { RoadDetailModal } from './components/RoadDetailModal';
import { DrainageDetailModal } from './components/DrainageDetailModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { FloodMap } from './map/FloodMap';

const HORIZONS = [0, 30, 60, 90, 120, 180];

export const App: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [timeOffsetMin, setTimeOffsetMin] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [whatIfParams, setWhatIfParams] = useState<WhatIfRequest>({
    rainfall_multiplier: 1.0,
    drain_blockage_pct: 0.0,
    initial_ponding_cm: 0.0,
    use_ml_surrogate: false,
    custom_scenario: 'Moderate Rain Scenario'
  });

  const [layers, setLayers] = useState<LayerVisibility>({
    floodDepth: true,
    roads: true,
    rainfallRadar: true,
    drainageNetwork: true,
    hotspots: true,
    elevationDEM: false,
    floodProbability: false,
  });

  const [floodMap, setFloodMap] = useState<FloodMapResponse | null>(null);
  const [drainageStatus, setDrainageStatus] = useState<DrainageStatusResponse | null>(null);
  const [roadStatus, setRoadStatus] = useState<RoadStatusResponse | null>(null);
  const [rainfallData, setRainfallData] = useState<RainfallNowcastResponse | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('hydrocast_sidebar_collapsed') === 'true';
  });
  const [isLayerControlOpen, setIsLayerControlOpen] = useState<boolean>(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState<boolean>(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState<boolean>(false);
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null);
  const [selectedDrainNode, setSelectedDrainNode] = useState<DrainageNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hydrocast_sidebar_collapsed', String(next));
      return next;
    });
  };

  const loadData = async (t: number, params: WhatIfRequest) => {
    setIsLoading(true);
    try {
      const [fm, ds, rs, rf] = await Promise.all([
        fetchFloodMap(t),
        fetchDrainageStatus(t),
        fetchRoadsStatus(t),
        fetchRainfallForecast(t, params.rainfall_multiplier),
      ]);
      setFloodMap(fm);
      setDrainageStatus(ds);
      setRoadStatus(rs);
      setRainfallData(rf);
    } catch (err) {
      console.error('Failed to fetch simulation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeOffsetMin, whatIfParams);
  }, [timeOffsetMin, whatIfParams]);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeOffsetMin((prev) => {
          const idx = HORIZONS.indexOf(prev);
          if (idx < HORIZONS.length - 1) {
            return HORIZONS[idx + 1];
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleApplyWhatIf = async (newParams: WhatIfRequest) => {
    setWhatIfParams(newParams);
    setIsLoading(true);
    try {
      await runWhatIfSimulation(newParams);
      await loadData(timeOffsetMin, newParams);
      addToast(
        'Scenario Applied',
        `${newParams.custom_scenario} (${newParams.rainfall_multiplier.toFixed(1)}x rain)`,
        'success'
      );
    } catch (err) {
      console.error('Failed to apply What-If scenario:', err);
      addToast('Error', 'Failed to calculate scenario parameters', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteCalculated = (route: RouteResponse | null) => {
    setRouteResult(route);
    if (route?.safe_route) {
      addToast(
        'Safe Route Generated',
        `ETA: ${route.safe_route.estimated_time_min.toFixed(1)}m | Bypassed ${route.safe_route.roads_avoided_count} hazards`,
        'info'
      );
    }
  };

  const toggleLayer = (layerKey: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050608] text-zinc-100 overflow-hidden select-none">
      {/* 1. Command Center Top Header */}
      <Header
        timeOffsetMin={timeOffsetMin}
        rainfallMultiplier={whatIfParams.rainfall_multiplier}
        simulationMode={whatIfParams.use_ml_surrogate ? 'ml_surrogate' : 'physical'}
        isLoading={isLoading}
        onOpenScenarioModal={() => setIsWhatIfOpen(true)}
        onOpenRoutePlanner={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
        onToggleLayerControl={() => setIsLayerControlOpen(!isLayerControlOpen)}
        isLayerControlOpen={isLayerControlOpen}
        isRoutingOpen={isRoutePlannerOpen}
      />

      {/* 2. Operations Console Workspace */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Dominant Leaflet Map Canvas (100% viewport) */}
        <FloodMap
          floodMap={floodMap}
          drainageStatus={drainageStatus}
          roadStatus={roadStatus}
          routeResult={routeResult}
          layers={layers}
          onSelectRoad={(road) => setSelectedRoad(road)}
          onSelectDrainNode={(node) => setSelectedDrainNode(node)}
          timeOffsetMin={timeOffsetMin}
        />

        {/* Floating Collapsible Left Risk Telemetry Sidebar */}
        <StatsSidebar
          floodMap={floodMap}
          drainageStatus={drainageStatus}
          roadStatus={roadStatus}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Floating Layer Control Drawer */}
        <LayerControl
          isOpen={isLayerControlOpen}
          onClose={() => setIsLayerControlOpen(false)}
          layers={layers}
          onToggleLayer={toggleLayer}
        />

        {/* Floating Safe Route Planner */}
        <RoutePlanner
          isOpen={isRoutePlannerOpen}
          onClose={() => setIsRoutePlannerOpen(false)}
          roads={roadStatus?.roads || []}
          timeOffsetMin={timeOffsetMin}
          onRouteCalculated={handleRouteCalculated}
        />

        {/* Bottom Floating Docks (Timeline Scrubber & Collapsible Analytics) */}
        <div className="absolute bottom-4 left-4 right-4 z-[850] flex flex-col md:flex-row items-end justify-between gap-3 pointer-events-none">
          {/* Left/Center: Timeline Scrubber */}
          <div className="pointer-events-auto w-full md:w-auto">
            <TimeSlider
              timeOffsetMin={timeOffsetMin}
              onTimeChange={(t) => setTimeOffsetMin(t)}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              rainfallMultiplier={whatIfParams.rainfall_multiplier}
            />
          </div>

          {/* Right: Minimized/Collapsible Analytics Drawer */}
          <div className="pointer-events-auto">
            <ChartsPanel
              rainfallData={rainfallData}
              timeOffsetMin={timeOffsetMin}
              drainageStatus={drainageStatus}
              roadStatus={roadStatus}
            />
          </div>
        </div>
      </div>

      {/* 3. Operational Modals */}
      <WhatIfModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        currentParams={whatIfParams}
        onApply={handleApplyWhatIf}
        isLoading={isLoading}
      />

      <RoadDetailModal
        road={selectedRoad}
        onClose={() => setSelectedRoad(null)}
      />

      <DrainageDetailModal
        node={selectedDrainNode}
        onClose={() => setSelectedDrainNode(null)}
      />

      {/* 4. Non-Intrusive Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
