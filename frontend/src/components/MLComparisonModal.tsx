import React, { useEffect, useState } from 'react';
import { X, Cpu, BarChart2, ShieldCheck, RefreshCw } from 'lucide-react';
import { MLMetrics } from '../types';
import { fetchMLMetrics } from '../api/client';

interface MLComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MLComparisonModal: React.FC<MLComparisonModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchMLMetrics()
        .then((data) => setMetrics(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-[#23354e] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 select-none">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Model Details & System Architecture
              </h2>
              <p className="text-[11px] text-slate-300">
                Physics-Informed XGBoost Surrogate for Rapid Flood Nowcasting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Architecture Overview */}
          <div className="p-3 rounded-xl bg-[#121c2e] border border-[#20324c] space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-blue-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Surrogate Model Pipeline
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              HydroCast couples high-resolution terrain elevation (DEM), urban imperviousness, and drainage network topology into a fast <strong>XGBoost surrogate</strong>. This enables sub-millisecond flood depth predictions across the urban grid without running slow differential equation solvers.
            </p>
          </div>

          {loading || !metrics ? (
            <div className="py-8 text-center text-slate-300 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span>Loading model evaluation benchmarks...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Latency Comparison */}
              <div className="bg-[#121c2e] p-3 rounded-xl border border-[#20324c]">
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Inference Latency & Speedup</span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-700/40 text-[10px]">
                    {metrics.speedup_factor} Faster
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#0b1320] border border-slate-800">
                    <div className="text-slate-300 text-[10px]">Physical Numerical Solver</div>
                    <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                      {metrics.physical_solver_latency_ms} <span className="text-[10px] font-normal text-slate-400">ms / step</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0b1320] border border-blue-900/40">
                    <div className="text-blue-300 text-[10px] font-semibold">XGBoost Surrogate</div>
                    <div className="text-base font-bold font-mono text-blue-200 mt-0.5">
                      {metrics.inference_latency_ms} <span className="text-[10px] font-normal text-slate-400">ms / step</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accuracy Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#121c2e] border border-[#20324c]">
                  <div className="text-slate-300 text-[10px]">Fit (R² Score)</div>
                  <div className="text-lg font-black font-mono text-cyan-300 mt-0.5">
                    {metrics.r2_score.toFixed(3)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121c2e] border border-[#20324c]">
                  <div className="text-slate-300 text-[10px]">Mean Error (MAE)</div>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                    {metrics.mae_cm.toFixed(2)} <span className="text-[10px] font-normal">cm</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121c2e] border border-[#20324c]">
                  <div className="text-slate-300 text-[10px]">Residual (RMSE)</div>
                  <div className="text-lg font-black font-mono text-purple-300 mt-0.5">
                    {metrics.rmse_cm.toFixed(2)} <span className="text-[10px] font-normal">cm</span>
                  </div>
                </div>
              </div>

              {/* Feature Importances */}
              <div className="bg-[#121c2e] p-3 rounded-xl border border-[#20324c] space-y-2">
                <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Hydrological Feature Weights</span>
                  <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                </div>

                <div className="space-y-1.5">
                  {Object.entries(metrics.feature_importances)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-mono text-slate-200">{key.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-blue-300 font-bold">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, val * 100 * 2.2)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

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
