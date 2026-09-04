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
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [backendErrorMessage, setBackendErrorMessage] = useState<string | null>(null);

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
      setIsBackendConnected(true);
      setBackendErrorMessage(null);
    } catch (err: any) {
      console.error(
        '[HydroCast AI Error] Unable to connect to Python FastAPI backend at http://127.0.0.1:8000.\n' +
        'Please ensure the backend is running:\n' +
        '  python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000\n' +
        'Error details:',
        err
      );
      setIsBackendConnected(false);
      setBackendErrorMessage(
        'Python FastAPI backend is offline at http://127.0.0.1:8000. Start it with: python -m uvicorn backend.main:app --port 8000'
      );
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
        isBackendConnected={isBackendConnected}
        onOpenScenarioModal={() => setIsWhatIfOpen(true)}
        onOpenRoutePlanner={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
        onToggleLayerControl={() => setIsLayerControlOpen(!isLayerControlOpen)}
        isLayerControlOpen={isLayerControlOpen}
        isRoutingOpen={isRoutePlannerOpen}
      />

      {/* 2. Operations Console Workspace */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Backend Offline Warning Banner */}
        {!isBackendConnected && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1500] max-w-2xl w-[92%] bg-rose-950/90 border border-rose-500/50 backdrop-blur-xl px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs text-rose-100 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
              <div>
                <strong className="text-white font-semibold">FastAPI Backend Offline (Port 8000 Unreachable):</strong>
                <p className="text-[11px] text-rose-200 mt-0.5">
                  The Python simulation service is not running, so live Jaipur flood data cannot load.
                  Start it in a terminal using:
                  <code className="ml-1.5 px-2 py-0.5 bg-black/60 rounded text-sky-300 font-mono font-semibold">python -m uvicorn backend.main:app --port 8000</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => loadData(timeOffsetMin, whatIfParams)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-xs transition shrink-0 cursor-pointer shadow-md"
            >
              Retry
            </button>
          </div>
        )}

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
