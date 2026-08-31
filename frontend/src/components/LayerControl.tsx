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
    { key: 'floodDepth', label: 'Flood Depth Grid', sublabel: 'Inundation height in cm', icon: <Waves className="w-4 h-4" />, color: 'text-blue-400' },
    { key: 'roads', label: 'Road Risk & Closures', sublabel: 'Inundation severity & access', icon: <Navigation className="w-4 h-4" />, color: 'text-amber-400' },
    { key: 'rainfallRadar', label: 'Rainfall Nowcast (Simulated)', sublabel: 'Convective storm cell radar', icon: <CloudRain className="w-4 h-4" />, color: 'text-cyan-400' },
    { key: 'drainageNetwork', label: 'Drainage Network & Surcharge', sublabel: 'Pipes, manholes, backflow', icon: <Activity className="w-4 h-4" />, color: 'text-emerald-400' },
    { key: 'hotspots', label: 'Critical Sump Locations', sublabel: 'Depression sumps & underpasses', icon: <MapPin className="w-4 h-4" />, color: 'text-red-400' },
    { key: 'elevationDEM', label: 'DEM Elevation Model', sublabel: 'Topographic terrain contours', icon: <Mountain className="w-4 h-4" />, color: 'text-purple-400' },
  ];

  return (
    <div className="absolute top-4 right-4 z-[1000] w-72 bg-[#0f172a]/95 backdrop-blur-md border border-[#23354e] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-2 select-none">
      <div className="px-4 py-3 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Map Layers
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Close Layer Control"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        {layerItems.map((item) => {
          const isVisible = layers[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleLayer(item.key)}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer border ${
                isVisible
                  ? 'bg-[#152238] border-[#243a5e] text-slate-100'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className={item.color}>{item.icon}</span>
                <div>
                  <div className="font-semibold text-[11px] text-slate-100">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-[10px] text-slate-300">{item.sublabel}</div>
                  )}
                </div>
              </div>

              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                  isVisible
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-slate-500 bg-slate-900'
                }`}
              >
                {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
