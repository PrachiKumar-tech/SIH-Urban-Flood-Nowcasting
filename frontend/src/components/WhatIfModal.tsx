import React, { useState } from 'react';
import { X, Sliders, Play, RefreshCw, Cpu } from 'lucide-react';
import { WhatIfRequest } from '../types';

interface WhatIfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: WhatIfRequest;
  onApply: (params: WhatIfRequest) => void;
  isLoading: boolean;
}

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  onApply,
  isLoading
}) => {
  const [params, setParams] = useState<WhatIfRequest>({ ...currentParams });

  if (!isOpen) return null;

  const presets = [
    {
      name: 'Moderate Rain (35 mm/h)',
      desc: 'Standard convective rainfall with normal drainage clearance',
      p: { rainfall_multiplier: 1.0, drain_blockage_pct: 0, initial_ponding_cm: 0, use_ml_surrogate: false, custom_scenario: 'Moderate Rain' }
    },
    {
      name: 'Heavy Rain (60 mm/h)',
      desc: 'Sustained monsoon downpour with 20% localized drain blockage',
      p: { rainfall_multiplier: 1.5, drain_blockage_pct: 20, initial_ponding_cm: 2, use_ml_surrogate: false, custom_scenario: 'Heavy Rain' }
    },
    {
      name: 'Extreme Monsoon (90 mm/h)',
      desc: 'Intense cloudburst event causing widespread street submergence',
      p: { rainfall_multiplier: 2.2, drain_blockage_pct: 35, initial_ponding_cm: 4, use_ml_surrogate: false, custom_scenario: 'Extreme Monsoon' }
    },
    {
      name: 'Choked Drainage (50% Blockage)',
      desc: 'Moderate rain coupled with severe solid waste trunk choke',
      p: { rainfall_multiplier: 1.2, drain_blockage_pct: 50, initial_ponding_cm: 1, use_ml_surrogate: false, custom_scenario: 'Choked Drainage Scenario' }
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(params);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in select-none">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/40">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Scenario Simulation (What-If Stress Testing)
              </h2>
              <p className="text-[11px] text-zinc-400 font-normal">
                Stress-test drainage capacity and evaluate flood propagation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.10] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Preset Buttons */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">
              Simulation Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => setParams({ ...preset.p })}
                  className="p-3 rounded-xl text-left glass-card hover:border-sky-400/50 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="font-semibold text-zinc-100 text-[11px]">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Container */}
          <div className="space-y-3.5 glass-card p-4 rounded-xl">
            {/* Rainfall Multiplier */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-zinc-200">Rainfall Intensity Multiplier:</span>
                <span className="font-mono font-bold text-sky-400">
                  {params.rainfall_multiplier.toFixed(1)}&times;
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={params.rainfall_multiplier}
                onChange={(e) => setParams({ ...params, rainfall_multiplier: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-black/60 rounded-sm appearance-none cursor-pointer accent-sky-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>0.5&times; (Light)</span>
                <span>1.0&times; (Normal)</span>
                <span>2.0&times; (Heavy)</span>
                <span>3.0&times; (Extreme)</span>
              </div>
            </div>

            {/* Drainage Blockage */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-zinc-200">Drainage Siltation / Blockage:</span>
                <span className="font-mono font-bold text-amber-400">
                  {params.drain_blockage_pct.toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={params.drain_blockage_pct}
                onChange={(e) => setParams({ ...params, drain_blockage_pct: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-black/60 rounded-sm appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>0% (Clear)</span>
                <span>25% (Moderate)</span>
                <span>50% (High Silt)</span>
                <span>80% (Severe Choke)</span>
              </div>
            </div>

            {/* Initial Ponding */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-zinc-200">Antecedent Water Ponding:</span>
                <span className="font-mono font-bold text-purple-300">
                  {params.initial_ponding_cm.toFixed(0)} cm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={params.initial_ponding_cm}
                onChange={(e) => setParams({ ...params, initial_ponding_cm: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-black/60 rounded-sm appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* ML Surrogate Toggle */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-[11px] font-semibold text-zinc-200">
                    XGBoost Fast ML Surrogate Inference
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Pre-trained model for sub-millisecond scenario screening
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.use_ml_surrogate}
                  onChange={(e) => setParams({ ...params, use_ml_surrogate: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-black/60 border border-white/[0.15] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white glass-btn-active shadow-md flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Apply Scenario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
