import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Shield,
  Truck,
  Car,
  AlertTriangle,
  MapPin,
  RefreshCw,
  X
} from 'lucide-react';
import { RouteResponse, VehicleType, RoadSegment } from '../types';
import { fetchRoute } from '../api/client';

interface RoutePlannerProps {
  isOpen: boolean;
  onClose: () => void;
  roads: RoadSegment[];
  timeOffsetMin: number;
  onRouteCalculated: (route: RouteResponse | null) => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  isOpen,
  onClose,
  roads,
  timeOffsetMin,
  onRouteCalculated
}) => {
  const [originId, setOriginId] = useState<string>('RD-01');
  const [destId, setDestId] = useState<string>('RD-26');
  const [vehicleType, setVehicleType] = useState<VehicleType>('emergency');
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const calculate = async () => {
    setIsLoading(true);
    try {
      const res = await fetchRoute({
        origin_road_id: originId,
        destination_road_id: destId,
        vehicle_type: vehicleType,
        time_offset_min: timeOffsetMin
      });
      setRouteResult(res);
      onRouteCalculated(res);
    } catch (err) {
      console.error('Error calculating route:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      calculate();
    }
  }, [isOpen, originId, destId, vehicleType, timeOffsetMin]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-3.5 left-3.5 z-[1000] w-88 max-h-[calc(100vh-5rem)] glass-panel rounded-2xl shadow-2xl overflow-y-auto flex flex-col animate-in fade-in select-none">
      {/* Header */}
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
            Safe Route Navigation
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.10] rounded-md transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3.5 space-y-3 text-xs">
        {/* Origin Selector */}
        <div>
          <label className="text-zinc-400 font-medium block mb-1.5 flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3 h-3 text-emerald-400" />
            Origin (Start Corridor):
          </label>
          <select
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="w-full bg-black/50 border border-white/[0.12] text-zinc-100 rounded-xl p-2.5 text-xs focus:border-sky-400 focus:outline-none cursor-pointer"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id} className="bg-zinc-950 text-white">
                {r.name} ({r.id})
              </option>
            ))}
          </select>
        </div>

        {/* Destination Selector */}
        <div>
          <label className="text-zinc-400 font-medium block mb-1.5 flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3 h-3 text-rose-400" />
            Destination (Terminal):
          </label>
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            className="w-full bg-black/50 border border-white/[0.12] text-zinc-100 rounded-xl p-2.5 text-xs focus:border-sky-400 focus:outline-none cursor-pointer"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id} className="bg-zinc-950 text-white">
                {r.name} ({r.id})
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Profile */}
        <div>
          <label className="text-zinc-400 font-medium block mb-1.5 text-[11px]">
            Vehicle Clearance Profile:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVehicleType('normal')}
              className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                vehicleType === 'normal'
                  ? 'glass-btn-active font-semibold'
                  : 'glass-btn text-zinc-400'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Standard (&le;15cm)</span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleType('emergency')}
              className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                vehicleType === 'emergency'
                  ? 'glass-btn-active font-semibold text-sky-200'
                  : 'glass-btn text-zinc-400'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Emergency (&le;35cm)</span>
            </button>
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={isLoading}
          className="w-full py-2.5 glass-btn-active font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 text-xs shadow-md"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-200" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-sky-200" />
          )}
          <span>Calculate Safe Route</span>
        </button>

        {/* Route Details Card */}
        {routeResult && (
          <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
            {/* Safe Route Card */}
            <div className="p-3 rounded-xl glass-card">
              <div className="flex items-center justify-between text-sky-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Recommended Route
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 font-mono font-semibold shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  {routeResult.safe_route?.overall_risk}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center my-2 bg-black/40 p-2.5 rounded-xl border border-white/[0.06] text-xs">
                <div>
                  <div className="text-[10px] text-zinc-400">Distance</div>
                  <div className="font-mono font-bold text-white">
                    {((routeResult.safe_route?.total_distance_m || 0) / 1000).toFixed(2)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">ETA</div>
                  <div className="font-mono font-bold text-sky-400">
                    {routeResult.safe_route?.estimated_time_min.toFixed(1)} min
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">Max Depth</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {routeResult.safe_route?.max_water_depth_cm.toFixed(1)} cm
                  </div>
                </div>
              </div>

              {routeResult.safe_route?.roads_avoided_count ? (
                <div className="text-[10px] text-zinc-300 bg-black/40 p-2 rounded-lg border border-white/[0.06] mt-1.5">
                  <strong className="text-sky-400">Detour:</strong> Bypassed{' '}
                  <span className="font-semibold text-amber-300">
                    {routeResult.safe_route.roads_avoided_count} submerged corridors
                  </span>{' '}
                  ({routeResult.safe_route.roads_avoided_names.join(', ')}).
                </div>
              ) : null}
            </div>

            {/* Standard Path Comparison */}
            <div className="p-3 rounded-xl glass-card text-zinc-300 text-xs">
              <div className="flex items-center justify-between text-white font-semibold mb-1">
                <span className="text-[11px]">Standard Shortest Path</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  routeResult.normal_route?.overall_risk === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {routeResult.normal_route?.overall_risk}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1.5 text-zinc-400">
                <span>Dist: {((routeResult.normal_route?.total_distance_m || 0) / 1000).toFixed(2)} km</span>
                <span>ETA: {routeResult.normal_route?.estimated_time_min.toFixed(1)} min</span>
                <span className="text-rose-400 font-bold font-mono">
                  Max: {routeResult.normal_route?.max_water_depth_cm.toFixed(1)} cm
                </span>
              </div>
            </div>

            {/* Reroute Justification */}
            <div className="p-3 rounded-xl glass-card text-[11px] text-zinc-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300 text-[10px] uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Hydraulic Routing Rationale
              </div>
              <p className="leading-relaxed text-zinc-400 text-[11px]">
                {routeResult.reroute_justification}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
