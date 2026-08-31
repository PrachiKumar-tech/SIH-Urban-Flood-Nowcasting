import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend
} from 'recharts';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { RainfallNowcastResponse, DrainageStatusResponse, RoadStatusResponse } from '../types';

interface ChartsPanelProps {
  rainfallData: RainfallNowcastResponse | null;
  timeOffsetMin: number;
  drainageStatus: DrainageStatusResponse | null;
  roadStatus: RoadStatusResponse | null;
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({
  rainfallData,
  timeOffsetMin,
  drainageStatus,
  roadStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'rainfall' | 'roads' | 'drainage'>('rainfall');

  const rainfallChartData = rainfallData?.forecast_steps.map((step) => ({
    time: `T+${step.time_offset_min}m`,
    time_min: step.time_offset_min,
    mean_intensity: step.mean_intensity_mm_hr,
    max_intensity: step.max_intensity_mm_hr,
  })) || [
    { time: 'T+0m', time_min: 0, mean_intensity: 20, max_intensity: 28 },
    { time: 'T+30m', time_min: 30, mean_intensity: 35, max_intensity: 49 },
    { time: 'T+60m', time_min: 60, mean_intensity: 55, max_intensity: 77 },
    { time: 'T+90m', time_min: 90, mean_intensity: 75, max_intensity: 105 },
    { time: 'T+120m', time_min: 120, mean_intensity: 90, max_intensity: 126 },
    { time: 'T+180m', time_min: 180, mean_intensity: 65, max_intensity: 91 },
  ];

  const totalRoads = roadStatus?.total_roads ?? 28;

  const roadProgressionData = [
    { time: 'T+0m', open: totalRoads, caution: 0, closed: 0 },
    { time: 'T+30m', open: Math.max(0, totalRoads - 5), caution: 4, closed: 1 },
    { time: 'T+60m', open: Math.max(0, totalRoads - 12), caution: 7, closed: 5 },
    { time: 'T+90m', open: Math.max(0, totalRoads - 18), caution: 9, closed: 9 },
    { time: 'T+120m', open: Math.max(0, totalRoads - 22), caution: 8, closed: 14 },
    { time: 'T+180m', open: Math.max(0, totalRoads - 15), caution: 9, closed: 6 },
  ];

  const drainageBarData = drainageStatus?.nodes.slice(0, 10).map((n) => ({
    id: n.id,
    name: n.name.split(' ')[0],
    utilization: n.utilization_pct,
    capacity: n.current_capacity_m3_s,
    inflow: n.inflow_m3_s,
    surcharged: n.is_surcharged
  })) || [];

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="bg-[#0f172a]/95 backdrop-blur-md hover:bg-[#1e293b] text-slate-100 px-3.5 py-2 rounded-xl border border-[#23354e] shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition active:scale-95 select-none"
        title="Open Analytics & Hydrographs Panel"
      >
        <BarChart2 className="w-4 h-4 text-blue-400" />
        <span>Analytics & Hydrographs</span>
        <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl bg-[#0f172a]/95 backdrop-blur-md border border-[#23354e] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 select-none">
      <div className="px-4 py-2.5 bg-[#131f33] border-b border-[#1f304a] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Analytics & Hydrographs
          </span>
        </div>

        <div className="flex items-center space-x-1 bg-[#0b1320] p-0.5 rounded-lg border border-[#1f304a] text-xs">
          <button
            onClick={() => setActiveTab('rainfall')}
            className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer text-[11px] ${
              activeTab === 'rainfall'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Rainfall
          </button>
          <button
            onClick={() => setActiveTab('roads')}
            className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer text-[11px] ${
              activeTab === 'roads'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Road Risk
          </button>
          <button
            onClick={() => setActiveTab('drainage')}
            className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer text-[11px] ${
              activeTab === 'drainage'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Drainage
          </button>
        </div>

        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Minimize Analytics Panel"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 h-44 w-full">
        {activeTab === 'rainfall' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rainfallChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="rainMaxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="rainMeanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#23354e" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} unit=" mm/h" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Area
                type="monotone"
                dataKey="max_intensity"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#rainMaxGrad)"
                name="Peak Intensity (mm/h)"
              />
              <Area
                type="monotone"
                dataKey="mean_intensity"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#rainMeanGrad)"
                name="Mean Intensity (mm/h)"
              />
              <ReferenceLine x={`T+${timeOffsetMin}m`} stroke="#f59e0b" strokeWidth={1.5} label={{ value: 'CURRENT', fill: '#f59e0b', fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'roads' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roadProgressionData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23354e" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
              <Bar dataKey="open" stackId="a" fill="#10b981" name="Open" />
              <Bar dataKey="caution" stackId="a" fill="#f59e0b" name="Caution" />
              <Bar dataKey="closed" stackId="a" fill="#ef4444" name="Closed" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'drainage' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={drainageBarData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23354e" />
              <XAxis dataKey="id" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              />
              <Bar
                dataKey="utilization"
                fill="#0284c7"
                name="Capacity Utilization %"
                radius={[3, 3, 0, 0]}
              />
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'SURCHARGE', fill: '#ef4444', fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
