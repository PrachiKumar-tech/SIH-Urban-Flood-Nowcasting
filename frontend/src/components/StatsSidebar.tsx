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
  const rawLoc = floodMap?.high_risk_location ?? 'Central Corridor Underpass';
  // Clean raw grid coordinates from display name if present for a clean label
  const highRiskLoc = rawLoc.replace(/^Grid\s*\(\d+,\s*\d+\)\s*-\s*/i, '');

  const surchargedDrains = drainageStatus?.surcharged_nodes_count ?? 0;
  const totalDrains = drainageStatus?.total_nodes ?? 21;
  const closedRoads = roadStatus?.closed_roads ?? 0;
  const cautionRoads = roadStatus?.caution_roads ?? 0;
  const totalRoads = roadStatus?.total_roads ?? 28;

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
      <div className="absolute top-3.5 left-3.5 z-[900]">
        <button
          onClick={onToggleCollapse}
          className="glass-panel hover:bg-black/90 text-zinc-200 p-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium cursor-pointer transition-all hover:scale-105"
          title="Expand Risk Summary Sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono font-bold text-white">{maxDepth.toFixed(1)} cm</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ${riskBadgeClass}`}>
            {riskLabel}
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className="absolute top-3.5 left-3.5 z-[900] w-78 glass-panel rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 select-none animate-in fade-in">
      {/* 1. Clean Header */}
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]"></span>
          Current Flood Risk
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.10] transition cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-2.5">
        {/* 2. Primary Depth & Status Card */}
        <div className="glass-card p-3.5 rounded-xl">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                {maxDepth.toFixed(1)} <span className="text-xs font-normal text-zinc-400">cm</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-medium mt-0.5">Peak Predicted Depth</div>
            </div>
            <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${riskBadgeClass}`}>
              {riskLabel}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-400 text-[11px]">Critical Sump: </span>
              <span className="font-semibold text-white text-[11px]" title={highRiskLoc}>
                {highRiskLoc}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Core Operational Indicators (Single 2-col row) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Road Closures */}
          <div className="glass-card p-3 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Road Closures</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {closedRoads} <span className="text-[10px] font-normal text-zinc-500">/ {totalRoads}</span>
            </div>
            <div className="text-[10px] text-amber-400 mt-0.5 font-medium truncate">
              {cautionRoads > 0 ? `+${cautionRoads} cautionary` : 'Normal flow'}
            </div>
          </div>

          {/* Drainage Overload */}
          <div className="glass-card p-3 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Drain Surcharge</span>
              <Waves className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {surchargedDrains} <span className="text-[10px] font-normal text-zinc-500">/ {totalDrains}</span>
            </div>
            <div className="text-[10px] text-sky-400 mt-0.5 font-medium truncate">
              {totalDrains > 0 ? Math.round((surchargedDrains / totalDrains) * 100) : 0}% overloaded
            </div>
          </div>
        </div>

        {/* 4. Minimalist Severity Scale Bar */}
        <div className="glass-card px-3.5 py-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2 font-medium">
            <span>Severity Scale</span>
            <span className="font-mono text-zinc-500">&le;5 &bull; 15 &bull; 30+ cm</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className={`py-1 rounded-md text-[10px] font-medium transition ${
              maxDepth < 5 ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-black/30 text-zinc-500 border border-white/[0.05]'
            }`}>
              Safe
            </div>
            <div className={`py-1 rounded-md text-[10px] font-medium transition ${
              maxDepth >= 5 && maxDepth < 15 ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-black/30 text-zinc-500 border border-white/[0.05]'
            }`}>
              Watch
            </div>
            <div className={`py-1 rounded-md text-[10px] font-medium transition ${
              maxDepth >= 15 && maxDepth < 30 ? 'bg-orange-500/25 text-orange-200 border border-orange-500/50 font-semibold shadow-[0_0_8px_rgba(249,115,22,0.3)]' : 'bg-black/30 text-zinc-500 border border-white/[0.05]'
            }`}>
              Risk
            </div>
            <div className={`py-1 rounded-md text-[10px] font-medium transition ${
              maxDepth >= 30 ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50 font-semibold shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'bg-black/30 text-zinc-500 border border-white/[0.05]'
            }`}>
              Critical
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
