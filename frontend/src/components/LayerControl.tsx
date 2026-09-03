import React from 'react';
import { Waves, Navigation, CloudRain, Activity, MapPin, Mountain, X, Check } from 'lucide-react';

export interface LayerVisibility {
  floodDepth: boolean;
  roads: boolean;
  rainfallRadar: boolean;
  drainageNetwork: boolean;
  hotspots: boolean;
  elevationDEM: boolean;
  floodProbability: boolean;
}

interface LayerControlProps {
  isOpen: boolean;
  onClose: () => void;
  layers: LayerVisibility;
  onToggleLayer: (layerName: keyof LayerVisibility) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  isOpen,
  onClose,
  layers,
  onToggleLayer
}) => {
  if (!isOpen) return null;

  const layerItems: { key: keyof LayerVisibility; label: string; sublabel?: string; icon: React.ReactNode; color: string }[] = [
    { key: 'floodDepth', label: 'Flood Depth Grid', sublabel: 'Inundation height (cm)', icon: <Waves className="w-4 h-4" />, color: 'text-blue-400' },
    { key: 'roads', label: 'Road Risk & Closures', sublabel: 'Street submergence & access', icon: <Navigation className="w-4 h-4" />, color: 'text-amber-400' },
    { key: 'rainfallRadar', label: 'Rainfall Nowcast (Simulated)', sublabel: 'Convective storm cell radar', icon: <CloudRain className="w-4 h-4" />, color: 'text-cyan-400' },
    { key: 'drainageNetwork', label: 'Drainage Capacity & Surcharge', sublabel: 'Pipe capacity load & overflow', icon: <Activity className="w-4 h-4" />, color: 'text-emerald-400' },
    { key: 'hotspots', label: 'Critical Sump Locations', sublabel: 'Underpass sumps & depressions', icon: <MapPin className="w-4 h-4" />, color: 'text-red-400' },
    { key: 'elevationDEM', label: 'DEM Elevation Model', sublabel: 'NASA SRTM terrain elevation', icon: <Mountain className="w-4 h-4" />, color: 'text-purple-400' },
  ];

  return (
    <div className="absolute top-3.5 right-3.5 z-[1000] w-74 glass-panel rounded-2xl shadow-2xl overflow-hidden animate-in fade-in select-none">
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"></span>
          GIS Map Layers
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.10] transition cursor-pointer"
          title="Close Layer Control"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        {layerItems.map((item) => {
          const isVisible = layers[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleLayer(item.key)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer border ${
                isVisible
                  ? 'bg-sky-500/15 border-sky-400/40 text-white shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                  : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className={item.color}>{item.icon}</span>
                <div>
                  <div className="font-semibold text-[11px] text-zinc-100">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-[10px] text-zinc-400">{item.sublabel}</div>
                  )}
                </div>
              </div>

              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                  isVisible
                    ? 'bg-sky-500 border-sky-400 text-white shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                    : 'border-white/[0.12] bg-black/40'
                }`}
              >
                {isVisible && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
