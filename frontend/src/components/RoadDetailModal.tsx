import React from 'react';
import { X, Navigation, ShieldAlert } from 'lucide-react';
import { RoadSegment } from '../types';

interface RoadDetailModalProps {
  road: RoadSegment | null;
  onClose: () => void;
  onSelectAsRouteOrigin?: (roadId: string) => void;
}

export const RoadDetailModal: React.FC<RoadDetailModalProps> = ({
  road,
  onClose,
}) => {
  if (!road) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-[#23354e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 select-none">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{road.name}</h3>
              <span className="text-[10px] text-slate-400 font-mono">ID: {road.id} &bull; {road.category.toUpperCase()}</span>
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
          {/* Depth and Status */}
          <div className="bg-[#121c2e] p-3 rounded-xl border border-[#20324c] flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-[11px]">Current Water Depth</div>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                {road.current_depth_cm.toFixed(1)} <span className="text-xs font-normal text-slate-400">cm</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Max Predicted: <strong className="text-blue-300 font-mono">{road.predicted_max_depth_cm.toFixed(1)} cm</strong>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-xs inline-block ${
                road.severity === 'CRITICAL' ? 'badge-critical' :
                road.severity === 'FLOOD_RISK' ? 'badge-risk' :
                road.severity === 'WATCH' ? 'badge-watch' :
                'badge-safe'
              }`}>
                {road.status}
              </span>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Prob: <strong>{(road.flood_probability * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Segment Length</span>
              <div className="font-mono font-semibold text-slate-200 text-xs mt-0.5">
                {road.length_m.toFixed(0)} meters
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Road Elevation</span>
              <div className="font-mono font-semibold text-slate-200 text-xs mt-0.5">
                {road.elevation_m.toFixed(1)} m MSL
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Adjacent Drain</span>
              <div className="font-mono font-semibold text-blue-300 text-xs mt-0.5">
                {road.nearby_drain_id}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0b1320] border border-[#1e2e46]">
              <span className="text-slate-400">Drain Load</span>
              <div className="font-mono font-semibold text-amber-300 text-xs mt-0.5">
                {road.drain_utilization_pct.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Action Recommendation */}
          <div className="p-3 rounded-xl bg-[#121c2e] border border-[#20324c] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Emergency Advisory
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {road.recommended_action}
            </p>
          </div>

          {/* Passability Check */}
          <div className="space-y-1 text-[11px]">
            <div className={`p-2 rounded-lg flex items-center justify-between font-medium border ${
              road.impassable_for_normal
                ? 'bg-red-950/20 border-red-500/30 text-red-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <span>Standard Cars (&le;15cm):</span>
              <span className="font-bold">{road.impassable_for_normal ? 'IMPASSABLE' : 'PASSABLE'}</span>
            </div>

            <div className={`p-2 rounded-lg flex items-center justify-between font-medium border ${
              road.impassable_for_emergency
                ? 'bg-red-950/20 border-red-500/30 text-red-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <span>Emergency Trucks (&le;35cm):</span>
              <span className="font-bold">{road.impassable_for_emergency ? 'IMPASSABLE' : 'PASSABLE'}</span>
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
