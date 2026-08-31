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
import { MLComparisonModal } from './components/MLComparisonModal';
import { FloodMap } from './map/FloodMap';

const HORIZONS = [0, 30, 60, 90, 120, 180];

export const App: React.FC = () => {
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
  const [isMLModalOpen, setIsMLModalOpen] = useState<boolean>(false);
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
    } catch (err) {
      console.error('Failed to apply What-If scenario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLayer = (layerKey: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a101d] text-slate-100 overflow-hidden select-none">
      {/* 1. Clean Top Header */}
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
        onOpenModelDetails={() => setIsMLModalOpen(true)}
      />

      {/* 2. Main Full-Screen Map Canvas with Floating Operational Panels */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Dominant Map (100% viewport) */}
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

        {/* Floating Collapsible Left Risk Sidebar */}
        <StatsSidebar
          floodMap={floodMap}
          drainageStatus={drainageStatus}
          roadStatus={roadStatus}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenModelDetails={() => setIsMLModalOpen(true)}
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
          onRouteCalculated={(r) => setRouteResult(r)}
        />

        {/* Bottom Floating Docks (Timeline & Collapsible Analytics) */}
        <div className="absolute bottom-4 left-4 right-4 z-[850] flex flex-col md:flex-row items-end justify-between gap-3 pointer-events-none">
          {/* Left/Center: Timeline Scrubber */}
          <div className="pointer-events-auto w-full md:max-w-2xl">
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

      <MLComparisonModal
        isOpen={isMLModalOpen}
        onClose={() => setIsMLModalOpen(false)}
      />

      <RoadDetailModal
        road={selectedRoad}
        onClose={() => setSelectedRoad(null)}
      />

      <DrainageDetailModal
        node={selectedDrainNode}
        onClose={() => setSelectedDrainNode(null)}
      />
    </div>
  );
};

export default App;
