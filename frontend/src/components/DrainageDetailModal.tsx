import React from 'react';
import { X, Activity, AlertTriangle, CheckCircle, GitBranch } from 'lucide-react';
import { DrainageNode } from '../types';

interface DrainageDetailModalProps {
  node: DrainageNode | null;
  onClose: () => void;
}

export const DrainageDetailModal: React.FC<DrainageDetailModalProps> = ({
  node,
  onClose
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in select-none">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{node.name}</h3>
              <span className="text-[10px] text-zinc-400 font-mono">Node ID: {node.id} &bull; Grid ({node.grid_y}, {node.grid_x})</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.10] rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          {/* Surcharge Status */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            node.is_surcharged
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
              : 'glass-card text-white'
          }`}>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Hydraulic State</div>
              <div className="text-sm font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                {node.is_surcharged ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300 font-bold">SURCHARGED (OVERFLOW)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">NORMAL FLOW</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Capacity Load: <strong className="text-amber-400 font-mono">{node.utilization_pct.toFixed(0)}%</strong>
              </div>
            </div>

            {node.is_surcharged && (
              <div className="text-right">
                <div className="text-[10px] text-zinc-400">Street Backflow</div>
                <div className="text-base font-bold font-mono text-rose-400">
                  {node.overflow_m3_s.toFixed(1)} <span className="text-[10px] font-normal">m³/s</span>
                </div>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Surface Inflow</span>
              <div className="font-mono font-bold text-sky-400 text-xs mt-0.5">
                {node.inflow_m3_s.toFixed(2)} m³/s
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Design Capacity</span>
              <div className="font-mono font-bold text-white text-xs mt-0.5">
                {node.current_capacity_m3_s.toFixed(2)} m³/s
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Ground Elevation</span>
              <div className="font-mono font-bold text-white text-xs mt-0.5">
                {node.ground_elevation_m.toFixed(1)} m MSL
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Invert Depth</span>
              <div className="font-mono font-bold text-white text-xs mt-0.5">
                {node.invert_elevation_m.toFixed(1)} m MSL
              </div>
            </div>
          </div>

          {/* Connected Conduits */}
          <div className="p-3.5 rounded-xl glass-card space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Connected Trunk Conduits
            </div>
            <div className="flex flex-wrap gap-1">
              {node.connected_pipes.map((pid) => (
                <span key={pid} className="px-2 py-0.5 rounded-md bg-black/40 border border-white/[0.08] text-zinc-200 font-mono text-[10px]">
                  {pid}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-white/[0.08]">
              <div className="text-[10px] text-zinc-400 mb-1">Impacted Roads:</div>
              <div className="flex flex-wrap gap-1">
                {node.affected_road_ids.length > 0 ? (
                  node.affected_road_ids.map((rid) => (
                    <span key={rid} className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono text-[10px]">
                      {rid}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-400 text-[10px]">No direct road overlay</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white glass-btn-active shadow-md transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
