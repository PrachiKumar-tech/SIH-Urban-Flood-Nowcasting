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
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in select-none">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/40">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{road.name}</h3>
              <span className="text-[10px] text-zinc-400 font-mono">ID: {road.id} &bull; {road.category.toUpperCase()}</span>
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
          {/* Depth and Status */}
          <div className="glass-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-zinc-400 text-[11px]">Current Water Depth</div>
              <div className="text-3xl font-black font-mono text-white mt-0.5">
                {road.current_depth_cm.toFixed(1)} <span className="text-xs font-normal text-zinc-400">cm</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Max Predicted: <strong className="text-sky-400 font-mono">{road.predicted_max_depth_cm.toFixed(1)} cm</strong>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono inline-block ${
                road.severity === 'CRITICAL' ? 'badge-critical' :
                road.severity === 'FLOOD_RISK' ? 'badge-risk' :
                road.severity === 'WATCH' ? 'badge-watch' :
                'badge-safe'
              }`}>
                {road.status}
              </span>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                Prob: <strong>{(road.flood_probability * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Segment Length</span>
              <div className="font-mono font-bold text-white text-xs mt-0.5">
                {road.length_m.toFixed(0)} meters
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Road Elevation</span>
              <div className="font-mono font-bold text-white text-xs mt-0.5">
                {road.elevation_m.toFixed(1)} m MSL
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Adjacent Drain</span>
              <div className="font-mono font-bold text-sky-400 text-xs mt-0.5">
                {road.nearby_drain_id}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-zinc-400 text-[10px]">Drain Load</span>
              <div className="font-mono font-bold text-amber-400 text-xs mt-0.5">
                {road.drain_utilization_pct.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Action Recommendation */}
          <div className="p-3.5 rounded-xl glass-card space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Emergency Advisory
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              {road.recommended_action}
            </p>
          </div>

          {/* Passability Check */}
          <div className="space-y-1.5 text-[11px]">
            <div className={`p-2.5 rounded-xl flex items-center justify-between font-medium border ${
              road.impassable_for_normal
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
            }`}>
              <span>Standard Cars (&le;15cm):</span>
              <span className="font-bold text-[10px] uppercase tracking-wide">{road.impassable_for_normal ? 'IMPASSABLE' : 'PASSABLE'}</span>
            </div>

            <div className={`p-2.5 rounded-xl flex items-center justify-between font-medium border ${
              road.impassable_for_emergency
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
            }`}>
              <span>Emergency Trucks (&le;35cm):</span>
              <span className="font-bold text-[10px] uppercase tracking-wide">{road.impassable_for_emergency ? 'IMPASSABLE' : 'PASSABLE'}</span>
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
