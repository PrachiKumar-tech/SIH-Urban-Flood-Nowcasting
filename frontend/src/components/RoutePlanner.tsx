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
    <div className="absolute top-4 left-4 z-[1000] w-88 max-h-[calc(100vh-5.5rem)] bg-[#0f172a]/95 backdrop-blur-md border border-[#23354e] rounded-2xl shadow-2xl overflow-y-auto flex flex-col animate-in fade-in slide-in-from-left-2 select-none">
      {/* Header */}
      <div className="px-4 py-3 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Safe Route Navigation
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3 text-xs">
        {/* Origin Selector */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Origin (Start Corridor):
          </label>
          <select
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="w-full bg-[#121c2e] border border-[#20324c] text-slate-100 rounded-lg p-2 text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </select>
        </div>

        {/* Destination Selector */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            Destination (Terminal):
          </label>
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            className="w-full bg-[#121c2e] border border-[#20324c] text-slate-100 rounded-lg p-2 text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Profile */}
        <div>
          <label className="text-slate-300 font-semibold block mb-1 text-[11px]">
            Vehicle Clearance Profile:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVehicleType('normal')}
              className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                vehicleType === 'normal'
                  ? 'bg-blue-600/25 border-blue-500 text-blue-200 font-bold'
                  : 'bg-[#121c2e] border-[#20324c] text-slate-300 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Standard (&le;15cm)</span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleType('emergency')}
              className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 transition cursor-pointer text-xs ${
                vehicleType === 'emergency'
                  ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200 font-bold'
                  : 'bg-[#121c2e] border-[#20324c] text-slate-300 hover:text-white'
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
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 text-xs"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>Calculate Route</span>
        </button>

        {/* Route Details Card */}
        {routeResult && (
          <div className="space-y-2.5 pt-2 border-t border-slate-700/60">
            {/* Safe Route Card */}
            <div className="p-3 rounded-xl bg-[#121c2e] border border-cyan-500/40">
              <div className="flex items-center justify-between text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Recommended Safe Route
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {routeResult.safe_route?.overall_risk}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center my-2 bg-[#0b1320] p-1.5 rounded-lg text-xs">
                <div>
                  <div className="text-[10px] text-slate-300">Distance</div>
                  <div className="font-mono font-bold text-slate-100">
                    {((routeResult.safe_route?.total_distance_m || 0) / 1000).toFixed(2)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-300">ETA</div>
                  <div className="font-mono font-bold text-cyan-300">
                    {routeResult.safe_route?.estimated_time_min.toFixed(1)} min
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-300">Max Depth</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {routeResult.safe_route?.max_water_depth_cm.toFixed(1)} cm
                  </div>
                </div>
              </div>

              {routeResult.safe_route?.roads_avoided_count ? (
                <div className="text-[10px] text-cyan-100 bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40 mt-1">
                  <strong>Detour:</strong> Bypassed{' '}
                  <span className="font-bold text-amber-300">
                    {routeResult.safe_route.roads_avoided_count} flooded road segments
                  </span>{' '}
                  ({routeResult.safe_route.roads_avoided_names.join(', ')}).
                </div>
              ) : null}
            </div>

            {/* Standard Path Comparison */}
            <div className="p-2.5 rounded-xl bg-[#121c2e] border border-[#20324c] text-slate-300 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Standard Shortest Path</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${
                  routeResult.normal_route?.overall_risk === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {routeResult.normal_route?.overall_risk}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1 text-slate-200">
                <span>Dist: {((routeResult.normal_route?.total_distance_m || 0) / 1000).toFixed(2)} km</span>
                <span>ETA: {routeResult.normal_route?.estimated_time_min.toFixed(1)} min</span>
                <span className="text-red-400 font-bold font-mono">
                  Max: {routeResult.normal_route?.max_water_depth_cm.toFixed(1)} cm
                </span>
              </div>
            </div>

            {/* Reroute Justification */}
            <div className="p-2 rounded-xl bg-[#121c2e] border border-[#20324c] text-[11px] text-slate-200 space-y-1">
              <div className="font-semibold flex items-center gap-1 text-amber-300 text-[10px] uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Hydraulic Routing Rationale
              </div>
              <p className="leading-relaxed text-slate-300 text-[11px]">
                {routeResult.reroute_justification}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
