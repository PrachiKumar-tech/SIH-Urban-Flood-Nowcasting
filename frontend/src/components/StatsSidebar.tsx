import React from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Waves, MapPin } from 'lucide-react';
import { FloodMapResponse, DrainageStatusResponse, RoadStatusResponse } from '../types';

interface StatsSidebarProps {
  floodMap: FloodMapResponse | null;
  drainageStatus: DrainageStatusResponse | null;
  roadStatus: RoadStatusResponse | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenModelDetails?: () => void;
}

export const StatsSidebar: React.FC<StatsSidebarProps> = ({
  floodMap,
  drainageStatus,
  roadStatus,
  isCollapsed,
  onToggleCollapse,
}) => {
  const maxDepth = floodMap?.max_depth_cm ?? 0;
  const floodedAreaPct = floodMap?.flooded_area_pct ?? 0;
  const highRiskLoc = floodMap?.high_risk_location ?? 'ITO Ring Road Underpass Sump';
  const surchargedDrains = drainageStatus?.surcharged_nodes_count ?? 0;
  const totalDrains = drainageStatus?.total_nodes ?? 21;
  const closedRoads = roadStatus?.closed_roads ?? 0;
  const cautionRoads = roadStatus?.caution_roads ?? 0;

  const riskBadgeClass =
    maxDepth >= 30
      ? 'badge-critical'
      : maxDepth >= 15
      ? 'badge-risk'
      : maxDepth >= 5
      ? 'badge-watch'
      : 'badge-safe';

  const riskLabel =
    maxDepth >= 30 ? 'CRITICAL' : maxDepth >= 15 ? 'FLOOD RISK' : maxDepth >= 5 ? 'WATCH' : 'SAFE';

  if (isCollapsed) {
    return (
      <div className="absolute top-4 left-4 z-[900]">
        <button
          onClick={onToggleCollapse}
          className="bg-[#0f172a]/95 backdrop-blur-md hover:bg-[#1e293b] text-slate-100 p-2.5 rounded-xl border border-[#23354e] shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition active:scale-95"
          title="Expand Risk Summary Sidebar"
        >
          <ChevronRight className="w-4 h-4 text-blue-400" />
          <span className="font-mono font-bold text-white">{maxDepth.toFixed(1)} cm</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${riskBadgeClass}`}>
            {riskLabel}
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className="absolute top-4 left-4 z-[900] w-72 max-h-[calc(100vh-5.5rem)] bg-[#0f172a]/95 backdrop-blur-md border border-[#23354e] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in slide-in-from-left-2">
      {/* Header with Collapse Button */}
      <div className="px-4 py-3 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Current Flood Risk
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3 overflow-y-auto">
        {/* Main Risk Status Card */}
        <div className="bg-[#121c2e] p-3 rounded-xl border border-[#20324c]">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black font-mono tracking-tight text-white">
                {maxDepth.toFixed(1)} <span className="text-xs font-normal text-slate-300">cm</span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Peak Predicted Depth</div>
            </div>
            <div className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${riskBadgeClass}`}>
              {riskLabel}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-start gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="truncate">
              <span className="text-slate-400 text-[11px]">Critical: </span>
              <span className="font-semibold text-slate-100 text-[11px]" title={highRiskLoc}>
                {highRiskLoc}
              </span>
            </div>
          </div>
        </div>

        {/* Infrastructure & Drainage Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Road Closures */}
          <div className="bg-[#121c2e] p-2.5 rounded-xl border border-[#20324c]">
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Roads Closed</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {closedRoads} <span className="text-[10px] font-normal text-slate-300">/ {roadStatus?.total_roads ?? 28}</span>
            </div>
            <div className="text-[10px] text-amber-300 mt-0.5 font-medium">
              +{cautionRoads} cautionary
            </div>
          </div>

          {/* Drain Overload */}
          <div className="bg-[#121c2e] p-2.5 rounded-xl border border-[#20324c]">
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Drain Surcharge</span>
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {surchargedDrains} <span className="text-[10px] font-normal text-slate-300">/ {totalDrains}</span>
            </div>
            <div className="text-[10px] text-cyan-300 mt-0.5 font-medium">
              {totalDrains > 0 ? Math.round((surchargedDrains / totalDrains) * 100) : 0}% overloaded
            </div>
          </div>

          {/* Flooded Area */}
          <div className="bg-[#121c2e] p-2.5 rounded-xl border border-[#20324c]">
            <div className="text-slate-300 text-[11px]">Flooded Area</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {floodedAreaPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Water &ge; 15 cm</div>
          </div>

          {/* Surcharge Backflow Outflow */}
          <div className="bg-[#121c2e] p-2.5 rounded-xl border border-[#20324c]">
            <div className="text-slate-300 text-[11px]">Street Backflow</div>
            <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
              {(drainageStatus?.total_overflow_m3_s ?? 0).toFixed(1)}{' '}
              <span className="text-[10px] font-normal text-slate-300">m³/s</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Drain overflow</div>
          </div>
        </div>

        {/* Compact Severity Scale */}
        <div className="bg-[#121c2e] p-2.5 rounded-xl border border-[#20324c] space-y-1.5">
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Severity Scale
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <div className="flex items-center gap-1.5 p-1 rounded bg-[#0b1320]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">0–5 cm:</span>
              <span className="text-emerald-400 font-bold ml-auto">Safe</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-[#0b1320]">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span className="text-slate-300">5–15 cm:</span>
              <span className="text-yellow-400 font-bold ml-auto">Watch</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-[#0b1320]">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <span className="text-slate-300">15–30 cm:</span>
              <span className="text-orange-400 font-bold ml-auto">Risk</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-[#0b1320]">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-slate-300">&gt;30 cm:</span>
              <span className="text-red-400 font-bold ml-auto">Critical</span>
            </div>
          </div>
        </div>

        {/* Hotspots List */}
        {floodMap?.hotspots && floodMap.hotspots.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              Critical Sump Locations ({floodMap.hotspots.length})
            </div>
            <div className="space-y-1.5">
              {floodMap.hotspots.map((hs) => (
                <div
                  key={hs.id}
                  className="p-2 rounded-lg bg-[#121c2e] border border-[#20324c] hover:border-slate-500 transition text-[11px]"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-100 truncate max-w-[150px]">{hs.name}</span>
                    <span className={`font-mono text-[10px] px-1 py-0.2 rounded font-bold ${
                      hs.severity === 'CRITICAL' ? 'text-red-400' : hs.severity === 'FLOOD_RISK' ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                      {hs.water_depth_cm.toFixed(1)} cm
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 truncate">
                    Drain: <span className="font-mono text-cyan-300 font-medium">{hs.nearest_drain_id}</span> ({hs.drain_utilization_pct}% load)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
