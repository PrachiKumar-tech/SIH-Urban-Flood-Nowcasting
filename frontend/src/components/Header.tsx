import React from 'react';
import { Sliders, Navigation, Layers, Activity } from 'lucide-react';

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
  onOpenModelDetails?: () => void;
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
}) => {
  return (
    <header className="h-13 bg-black/75 backdrop-blur-xl border-b border-white/[0.10] shadow-[0_4px_24px_rgba(0,0,0,0.5)] px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Platform Title & Study Area */}
      <div className="flex items-center space-x-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500/30 to-indigo-600/40 border border-sky-400/40 flex items-center justify-center font-bold text-sky-200 text-xs tracking-wider shadow-[0_0_12px_rgba(56,189,248,0.25)]">
          HC
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xs font-bold tracking-wide text-white uppercase">
              HydroCast <span className="text-sky-400">AI</span>
            </h1>
            <span className="text-[11px] font-normal text-zinc-400 border-l border-white/[0.12] pl-2">
              Urban Flood Nowcasting System
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-normal">
            Active Study Area &bull; <span className="text-zinc-200 font-medium">South Jaipur Catchment (Jawahar Circle • Malviya Nagar)</span>
          </p>
        </div>
      </div>

      {/* Center: System Status & Storm Readout */}
      <div className="hidden md:flex items-center space-x-2.5 text-xs">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
          <span className="text-[11px] font-semibold text-white">System Ready</span>
          <span className="text-zinc-600 font-mono text-[10px]">&bull;</span>
          <span className="text-[11px] text-zinc-400 font-normal">
            {simulationMode === 'ml_surrogate' ? 'XGBoost ML Surrogate Active' : 'Coupled Hydrodynamic + ML'}
          </span>
        </div>

        {rainfallMultiplier > 1.0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 text-[11px] font-mono font-medium backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>{rainfallMultiplier.toFixed(1)}&times; Storm Deluge</span>
          </div>
        )}
      </div>

      {/* Right: Operational Action Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenScenarioModal}
          className="flex items-center space-x-1.5 glass-btn text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
          title="Run scenario simulations and adjust weather/drainage parameters"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Run Scenario</span>
        </button>

        <button
          onClick={onOpenRoutePlanner}
          className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer ${
            isRoutingOpen
              ? 'glass-btn-active font-semibold'
              : 'glass-btn'
          }`}
          title="Plan flood-safe route for emergency vehicles and commuters"
        >
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Safe Route</span>
        </button>

        <button
          onClick={onToggleLayerControl}
          className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer ${
            isLayerControlOpen
              ? 'glass-btn-active font-semibold'
              : 'glass-btn'
          }`}
          title="Toggle map GIS layers"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-300" />
          <span className="hidden sm:inline">Layers</span>
        </button>
      </div>
    </header>
  );
};
