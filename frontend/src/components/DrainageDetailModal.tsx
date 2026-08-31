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
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-[#23354e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 select-none">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{node.name}</h3>
              <span className="text-[10px] text-slate-400 font-mono">Node ID: {node.id} &bull; Grid ({node.grid_y}, {node.grid_x})</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          {/* Surcharge Status */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            node.is_surcharged
              ? 'bg-red-950/20 border-red-500/30 text-red-200'
              : 'bg-[#121c2e] border-[#20324c] text-slate-200'
          }`}>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Hydraulic State</div>
              <div className="text-base font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                {node.is_surcharged ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-red-400">SURCHARGED (OVERFLOW)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">NORMAL FLOW</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Capacity Load: <strong className="text-amber-300 font-mono">{node.utilization_pct.toFixed(0)}%</strong>
              </div>
            </div>

            {node.is_surcharged && (
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Street Backflow</div>
                <div className="text-base font-black font-mono text-red-400">
                  {node.overflow_m3_s.toFixed(1)} <span className="text-[10px] font-normal">m³/s</span>
                </div>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Surface Inflow</span>
              <div className="font-mono font-semibold text-cyan-300 text-xs mt-0.5">
                {node.inflow_m3_s.toFixed(2)} m³/s
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Design Capacity</span>
              <div className="font-mono font-semibold text-slate-200 text-xs mt-0.5">
                {node.current_capacity_m3_s.toFixed(2)} m³/s
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Ground Elevation</span>
              <div className="font-mono font-semibold text-slate-200 text-xs mt-0.5">
                {node.ground_elevation_m.toFixed(1)} m MSL
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Invert Depth</span>
              <div className="font-mono font-semibold text-slate-200 text-xs mt-0.5">
                {node.invert_elevation_m.toFixed(1)} m MSL
              </div>
            </div>
          </div>

          {/* Connected Conduits */}
          <div className="p-3 rounded-xl bg-[#121c2e] border border-[#20324c] space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Connected Trunk Conduits
            </div>
            <div className="flex flex-wrap gap-1">
              {node.connected_pipes.map((pid) => (
                <span key={pid} className="px-1.5 py-0.2 rounded bg-[#0b1320] border border-slate-700 text-slate-300 font-mono text-[10px]">
                  {pid}
                </span>
              ))}
            </div>

            <div className="pt-1.5 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 mb-1">Impacted Roads:</div>
              <div className="flex flex-wrap gap-1">
                {node.affected_road_ids.length > 0 ? (
                  node.affected_road_ids.map((rid) => (
                    <span key={rid} className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[10px]">
                      {rid}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[10px]">No direct road overlay</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
