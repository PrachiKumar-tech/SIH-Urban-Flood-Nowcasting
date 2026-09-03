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
    <div className="fixed inset-0 z-[2000] bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#14162e] border border-[#2b305c] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in select-none">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#181b38] border-b border-[#252a54] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#5b4bf5]/20 text-[#5b4bf5] border border-[#5b4bf5]/40">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Model Details & System Architecture
              </h2>
              <p className="text-[11px] text-[#9aa2cd] font-normal">
                Physics-Informed XGBoost Surrogate for Rapid Flood Nowcasting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#9aa2cd] hover:text-white hover:bg-[#252a56] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          {/* Architecture Overview */}
          <div className="p-3 rounded-xl bg-[#1c2042] border border-[#2b305c] space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-[#38bdf8] text-xs">
              <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
              Surrogate Model Pipeline
            </div>
            <p className="text-[11px] leading-relaxed text-[#c5c9e4]">
              HydroCast couples terrain elevation (NASA SRTM 30m DEM), urban imperviousness, and drainage network topology into an <strong>XGBoost surrogate</strong>. This enables sub-millisecond flood depth predictions across the urban grid without running slow differential equation solvers.
            </p>
          </div>

          {loading || !metrics ? (
            <div className="py-8 text-center text-[#9aa2cd] flex flex-col items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#5b4bf5]" />
              <span>Loading model evaluation benchmarks...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Latency Comparison */}
              <div className="bg-[#1c2042] p-3 rounded-xl border border-[#2b305c]">
                <div className="text-[11px] font-bold text-[#9aa2cd] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Inference Latency & Speedup</span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                    {metrics.speedup_factor} Faster
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#111328] border border-[#24284d]">
                    <div className="text-[#9aa2cd] text-[10px]">Physical Numerical Solver</div>
                    <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                      {metrics.physical_solver_latency_ms} <span className="text-[10px] font-normal text-[#7178a3]">ms / step</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#111328] border border-[#5b4bf5]/30">
                    <div className="text-[#38bdf8] text-[10px] font-semibold">XGBoost Surrogate</div>
                    <div className="text-base font-bold font-mono text-[#38bdf8] mt-0.5">
                      {metrics.inference_latency_ms} <span className="text-[10px] font-normal text-[#7178a3]">ms / step</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accuracy Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#1c2042] border border-[#2b305c]">
                  <div className="text-[#9aa2cd] text-[10px]">Fit (R² Score)</div>
                  <div className="text-lg font-black font-mono text-[#38bdf8] mt-0.5">
                    {metrics.r2_score.toFixed(3)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1c2042] border border-[#2b305c]">
                  <div className="text-[#9aa2cd] text-[10px]">Mean Error (MAE)</div>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                    {metrics.mae_cm.toFixed(2)} <span className="text-[10px] font-normal text-[#7178a3]">cm</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1c2042] border border-[#2b305c]">
                  <div className="text-[#9aa2cd] text-[10px]">Residual (RMSE)</div>
                  <div className="text-lg font-black font-mono text-[#a78bfa] mt-0.5">
                    {metrics.rmse_cm.toFixed(2)} <span className="text-[10px] font-normal text-[#7178a3]">cm</span>
                  </div>
                </div>
              </div>

              {/* Feature Importances */}
              <div className="bg-[#1c2042] p-3 rounded-xl border border-[#2b305c] space-y-2">
                <div className="text-[11px] font-bold text-[#9aa2cd] uppercase tracking-wider flex items-center justify-between">
                  <span>Hydrological Feature Weights</span>
                  <BarChart2 className="w-3.5 h-3.5 text-[#5b4bf5]" />
                </div>

                <div className="space-y-1.5">
                  {Object.entries(metrics.feature_importances)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-mono text-[#c5c9e4]">{key.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[#5b4bf5] font-bold">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-[#111328] rounded-sm h-1.5 overflow-hidden border border-[#24284d]">
                          <div
                            className="bg-[#5b4bf5] h-full rounded-sm"
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
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#5b4bf5] hover:bg-[#4f46e5] border border-[#5b4bf5] shadow-md transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
