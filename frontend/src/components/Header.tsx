import React from 'react';
import { Sliders, Navigation, Layers, ShieldCheck, Activity } from 'lucide-react';

interface HeaderProps {
  timeOffsetMin: number;
  rainfallMultiplier: number;
  simulationMode: 'physical' | 'ml_surrogate';
  isLoading: boolean;
  onOpenScenarioModal: () => void;
  onOpenRoutePlanner: () => void;
  onToggleLayerControl: () => void;
  isLayerControlOpen: boolean;
  isRoutingOpen: boolean;
  onOpenModelDetails: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeOffsetMin,
  rainfallMultiplier,
  simulationMode,
  isLoading,
  onOpenScenarioModal,
  onOpenRoutePlanner,
  onToggleLayerControl,
  isLayerControlOpen,
  isRoutingOpen,
  onOpenModelDetails
}) => {
  return (
    <header className="h-14 bg-[#0a101d] border-b border-[#1c2a3e] px-4 flex items-center justify-between z-30 select-none shadow-md">
      {/* Left: Platform Title & Active Study Area */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm tracking-wider shadow-sm">
          HC
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              HydroCast <span className="text-blue-400">AI</span>
            </h1>
            <span className="text-[11px] font-medium text-slate-300 border-l border-slate-700 pl-2">
              Urban Flood Nowcasting System
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">
            Active Study Area &bull; <span className="text-blue-300 font-semibold">Delhi Pilot Catchment</span>
          </p>
        </div>
      </div>

      {/* Center/Right: Diagnostic Status & Storm Multiplier */}
      <div className="hidden lg:flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#101928] border border-[#1e2e46] text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-[11px] font-semibold text-slate-200">System Ready</span>
          <span className="text-slate-500 font-mono text-[10px]">&bull;</span>
          <span className="text-[11px] text-slate-300">
            {simulationMode === 'ml_surrogate' ? 'XGBoost ML Surrogate' : 'Flood Simulation + ML'}
          </span>
        </div>

        {rainfallMultiplier > 1.0 && (
          <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" />
            <span>{rainfallMultiplier.toFixed(1)}&times; Storm Intensity</span>
          </div>
        )}
      </div>

      {/* Right: Operational Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenScenarioModal}
          className="flex items-center space-x-1.5 bg-[#142236] hover:bg-[#1a2c47] text-slate-100 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#23354e] transition active:scale-95 cursor-pointer"
          title="Run scenario simulations and adjust weather/drainage parameters"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Run Scenario</span>
        </button>

        <button
          onClick={onOpenRoutePlanner}
          className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer border ${
            isRoutingOpen
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
              : 'bg-[#142236] hover:bg-[#1a2c47] text-slate-100 hover:text-white border-[#23354e]'
          }`}
          title="Plan flood-safe route for emergency vehicles and commuters"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Safe Route</span>
        </button>

        <button
          onClick={onToggleLayerControl}
          className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer border ${
            isLayerControlOpen
              ? 'bg-slate-700 text-white border-slate-600'
              : 'bg-[#142236] hover:bg-[#1a2c47] text-slate-100 hover:text-white border-[#23354e]'
          }`}
          title="Toggle map GIS layers"
        >
          <Layers className="w-3.5 h-3.5 text-slate-300" />
          <span>Layers</span>
        </button>

        <button
          onClick={onOpenModelDetails}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#142236] hover:bg-[#1a2c47] text-slate-300 hover:text-white border border-[#23354e] transition cursor-pointer text-xs font-medium"
          title="Model Details & System Architecture"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Model Info</span>
        </button>
      </div>
    </header>
  );
};
