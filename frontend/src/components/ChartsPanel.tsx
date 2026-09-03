import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend
} from 'recharts';
import { BarChart2, ChevronDown, ChevronUp, CloudRain, AlertTriangle, Droplets } from 'lucide-react';
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

  // 1. Data-backed Rainfall Hyetograph
  const rainfallChartData = rainfallData?.forecast_steps.map((step) => ({
    time: `T+${step.time_offset_min}m`,
    time_min: step.time_offset_min,
    mean_intensity: Math.round(step.mean_intensity_mm_hr),
    max_intensity: Math.round(step.max_intensity_mm_hr),
  })) || [
    { time: 'T+0m', time_min: 0, mean_intensity: 20, max_intensity: 28 },
    { time: 'T+30m', time_min: 30, mean_intensity: 35, max_intensity: 49 },
    { time: 'T+60m', time_min: 60, mean_intensity: 55, max_intensity: 77 },
    { time: 'T+90m', time_min: 90, mean_intensity: 75, max_intensity: 105 },
    { time: 'T+120m', time_min: 120, mean_intensity: 90, max_intensity: 126 },
    { time: 'T+180m', time_min: 180, mean_intensity: 65, max_intensity: 91 },
  ];

  const currentRainStep = rainfallChartData.find((s) => s.time_min === timeOffsetMin) || rainfallChartData[0];
  const peakRainStep = rainfallChartData.reduce((prev, curr) => (curr.max_intensity > prev.max_intensity ? curr : prev), rainfallChartData[0]);

  // 2. Data-backed Road Passability Progression
  const totalRoads = roadStatus?.total_roads ?? 28;
  const roadProgressionData = roadStatus?.road_progression && roadStatus.road_progression.length > 0
    ? roadStatus.road_progression.map((p) => ({
        time: p.time,
        time_min: p.time_min,
        open: p.open,
        caution: p.caution,
        closed: p.closed,
        total: p.total,
      }))
    : [
        { time: 'T+0m', time_min: 0, open: 25, caution: 3, closed: 0, total: totalRoads },
        { time: 'T+30m', time_min: 30, open: 24, caution: 4, closed: 0, total: totalRoads },
        { time: 'T+60m', time_min: 60, open: 21, caution: 7, closed: 0, total: totalRoads },
        { time: 'T+90m', time_min: 90, open: 18, caution: 7, closed: 3, total: totalRoads },
        { time: 'T+120m', time_min: 120, open: 16, caution: 8, closed: 4, total: totalRoads },
        { time: 'T+180m', time_min: 180, open: 21, caution: 7, closed: 0, total: totalRoads },
      ];

  // 3. Data-backed Drainage Critical Sump Nodes (Top 8 sorted by utilization)
  const sortedDrainNodes = drainageStatus?.nodes
    ? [...drainageStatus.nodes].sort((a, b) => b.utilization_pct - a.utilization_pct).slice(0, 8)
    : [];

  const drainageBarData = sortedDrainNodes.map((n) => ({
    id: n.id,
    name: n.name,
    utilization: Math.round(n.utilization_pct),
    capacity: n.current_capacity_m3_s.toFixed(1),
    inflow: n.inflow_m3_s.toFixed(1),
    overflow: n.overflow_m3_s.toFixed(1),
    surcharged: n.is_surcharged,
  }));

  const surchargedCount = drainageStatus?.surcharged_nodes_count ?? 0;
  const totalNodes = drainageStatus?.total_nodes ?? 21;
  const totalOverflow = drainageStatus?.total_overflow_m3_s?.toFixed(1) ?? '0.0';

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="glass-panel hover:bg-black/90 text-zinc-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-all select-none hover:scale-105"
        title="Open Analytics & Hydrographs Panel"
      >
        <BarChart2 className="w-4 h-4 text-sky-400" />
        <span>Analytics & Hydrographs</span>
        <ChevronUp className="w-4 h-4 text-zinc-400" />
      </button>
    );
  }

  return (
    <div className="w-[580px] max-w-[calc(100vw-2rem)] glass-panel rounded-2xl shadow-2xl overflow-hidden animate-in fade-in select-none">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Analytics & Hydrographs
          </span>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] text-xs">
          <button
            onClick={() => setActiveTab('rainfall')}
            className={`px-3 py-1 rounded-lg transition font-semibold cursor-pointer text-xs ${
              activeTab === 'rainfall'
                ? 'glass-btn-active'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Rainfall
          </button>
          <button
            onClick={() => setActiveTab('roads')}
            className={`px-3 py-1 rounded-lg transition font-semibold cursor-pointer text-xs ${
              activeTab === 'roads'
                ? 'glass-btn-active'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Road Risk
          </button>
          <button
            onClick={() => setActiveTab('drainage')}
            className={`px-3 py-1 rounded-lg transition font-semibold cursor-pointer text-xs ${
              activeTab === 'drainage'
                ? 'glass-btn-active'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Drainage
          </button>
        </div>

        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.10] transition cursor-pointer"
          title="Minimize Analytics Panel"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-3">
        {/* TAB 1: RAINFALL */}
        {activeTab === 'rainfall' && (
          <div>
            {/* Context KPI Bar */}
            <div className="grid grid-cols-2 gap-2 mb-3 glass-card p-3 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-[10px] text-zinc-400">Current Intensity at T+{timeOffsetMin}m</div>
                  <div className="font-mono font-bold text-white text-sm">
                    {currentRainStep.mean_intensity} mm/h{' '}
                    <span className="text-[10px] font-normal text-zinc-400">(Peak: {currentRainStep.max_intensity} mm/h)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
                <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></div>
                <div>
                  <div className="text-[10px] text-zinc-400">Peak Forecast Horizon</div>
                  <div className="font-mono font-bold text-rose-300 text-sm">
                    {peakRainStep.time} &bull; {peakRainStep.max_intensity} mm/h
                  </div>
                </div>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rainfallChartData} margin={{ top: 12, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rainPeakGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="rainMeanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(8, 10, 16, 0.92)',
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: '#ffffff',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(16px)',
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} mm/h`,
                      name === 'max_intensity' ? 'Peak Convective Burst' : 'Catchment Mean Rain',
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                    formatter={(value) => (value === 'max_intensity' ? 'Peak Burst' : 'Mean Intensity')}
                  />
                  <Area
                    type="monotone"
                    dataKey="max_intensity"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rainPeakGrad)"
                    name="max_intensity"
                  />
                  <Area
                    type="monotone"
                    dataKey="mean_intensity"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rainMeanGrad)"
                    name="mean_intensity"
                  />
                  <ReferenceLine
                    x={`T+${timeOffsetMin}m`}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: 'NOW', fill: '#f59e0b', fontSize: 10, position: 'top' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 2: ROAD RISK */}
        {activeTab === 'roads' && (
          <div>
            {/* Context KPI Bar */}
            <div className="grid grid-cols-3 gap-2 mb-3 glass-card p-3 rounded-xl text-xs text-center">
              <div>
                <div className="text-[10px] text-zinc-400">Open (Passable)</div>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  {roadStatus?.open_roads ?? 25} <span className="text-[10px] text-zinc-500">/ {totalRoads}</span>
                </div>
              </div>
              <div className="border-x border-white/[0.08]">
                <div className="text-[10px] text-zinc-400">Waterlogged (Caution)</div>
                <div className="font-mono font-bold text-amber-400 text-sm">
                  {roadStatus?.caution_roads ?? 3} <span className="text-[10px] text-zinc-500">/ {totalRoads}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Submerged (Closed)</div>
                <div className="font-mono font-bold text-rose-400 text-sm">
                  {roadStatus?.closed_roads ?? 0} <span className="text-[10px] text-zinc-500">/ {totalRoads}</span>
                </div>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roadProgressionData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, totalRoads]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(8, 10, 16, 0.92)',
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: '#ffffff',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(16px)',
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} roads`,
                      name === 'open' ? 'Open (Clear)' : name === 'caution' ? 'Caution (Ponded)' : 'Closed (Submerged)',
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                    formatter={(value) => (value === 'open' ? 'Open' : value === 'caution' ? 'Caution' : 'Closed')}
                  />
                  <Bar dataKey="open" stackId="a" fill="#10b981" name="open" radius={[0, 0, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="caution" stackId="a" fill="#f59e0b" name="caution" radius={[0, 0, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="closed" stackId="a" fill="#ef4444" name="closed" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <ReferenceLine
                    x={`T+${timeOffsetMin}m`}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: 'NOW', fill: '#f59e0b', fontSize: 10, position: 'top' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 3: DRAINAGE */}
        {activeTab === 'drainage' && (
          <div>
            {/* Context KPI Bar */}
            <div className="grid grid-cols-2 gap-2 mb-3 glass-card p-3 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-zinc-400">Surcharged Nodes (Over Capacity)</div>
                  <div className="font-mono font-bold text-rose-400 text-sm">
                    {surchargedCount} <span className="text-[10px] text-zinc-500">/ {totalNodes} sumps overflowing</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
                <Droplets className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-[10px] text-zinc-400">Street Backflow Volume</div>
                  <div className="font-mono font-bold text-sky-400 text-sm">
                    {totalOverflow} m³/s
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Drainage Node Capacity Bars */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drainageBarData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="id" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(8, 10, 16, 0.92)',
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: '#ffffff',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(16px)',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% (Inflow: ${item.payload.inflow} m³/s / Cap: ${item.payload.capacity} m³/s)`,
                      item.payload.name,
                    ]}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: '100% DESIGN CAPACITY', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Bar
                    dataKey="utilization"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    name="Capacity Load %"
                  >
                    {drainageBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.utilization >= 100 ? '#ef4444' : entry.utilization >= 75 ? '#f59e0b' : '#38bdf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
