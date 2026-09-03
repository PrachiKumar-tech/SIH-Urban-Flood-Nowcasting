import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, CloudRain } from 'lucide-react';

interface TimeSliderProps {
  timeOffsetMin: number;
  onTimeChange: (newTime: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  rainfallMultiplier: number;
}

const HORIZONS = [0, 30, 60, 90, 120, 180];
const BASE_RAINFALL: Record<number, number> = {
  0: 20,
  30: 35,
  60: 55,
  90: 75,
  120: 90,
  180: 65,
};

export const TimeSlider: React.FC<TimeSliderProps> = ({
  timeOffsetMin,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  rainfallMultiplier
}) => {
  const currentRain = Math.round(
    (BASE_RAINFALL[timeOffsetMin] || 45) * rainfallMultiplier
  );

  const handleStep = (direction: 'prev' | 'next') => {
    const currentIndex = HORIZONS.indexOf(timeOffsetMin);
    if (direction === 'prev' && currentIndex > 0) {
      onTimeChange(HORIZONS[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < HORIZONS.length - 1) {
      onTimeChange(HORIZONS[currentIndex + 1]);
    }
  };

  const getHorizonLabel = (t: number) => {
    return t === 0 ? 'CURRENT (T+0)' : `T+${t} min`;
  };

  return (
    <div className="glass-panel rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 select-none text-xs w-full sm:w-[580px] lg:w-[620px]">
      {/* 1. Top Header & Telemetry Row */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
            Flood Forecast Timeline (0–3 Hours)
          </span>
        </div>

        {/* Current State & Rain Readout */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-zinc-400 text-[11px] font-normal">Horizon:</span>
            <span className="font-mono text-[11px] font-bold text-sky-400">
              {getHorizonLabel(timeOffsetMin)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-zinc-400 text-[11px] font-normal">Rainfall:</span>
            <span className="font-mono text-[11px] font-bold text-sky-400">
              {currentRain} <span className="text-[10px] font-normal text-zinc-500">mm/h</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Timestep Scrubber Row */}
      <div className="flex items-center gap-2">
        {/* Playback Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => handleStep('prev')}
            disabled={timeOffsetMin === 0}
            className="w-8 h-8 rounded-lg glass-btn disabled:opacity-25 text-zinc-300 transition flex items-center justify-center cursor-pointer"
            title="Previous Forecast Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`h-8 px-3 rounded-lg flex items-center justify-center font-semibold text-white transition cursor-pointer text-xs gap-1.5 border shadow-sm ${
              isPlaying
                ? 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'glass-btn-active'
            }`}
            title={isPlaying ? 'Pause Forecast Animation' : 'Play 0–3 Hour Forecast Timeline'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-amber-200 text-amber-200" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-sky-200 text-sky-200" />
                <span>Play 0–3h</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleStep('next')}
            disabled={timeOffsetMin === 180}
            className="w-8 h-8 rounded-lg glass-btn disabled:opacity-25 text-zinc-300 transition flex items-center justify-center cursor-pointer"
            title="Next Forecast Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timestep Buttons Grid */}
        <div className="flex-1 grid grid-cols-6 gap-1.5">
          {HORIZONS.map((step) => {
            const isSelected = timeOffsetMin === step;
            const isCurrent = step === 0;
            const rainVal = Math.round(
              (BASE_RAINFALL[step] || 0) * rainfallMultiplier
            );

            return (
              <button
                key={step}
                onClick={() => onTimeChange(step)}
                className={`py-1.5 px-1 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center ${
                  isSelected
                    ? 'glass-btn-active font-bold'
                    : 'glass-btn'
                }`}
                title={`Select forecast horizon: ${getHorizonLabel(step)} (${rainVal} mm/h)`}
              >
                <span className="text-[11px] font-mono font-bold tracking-tight">
                  {isCurrent ? 'T+0' : `+${step}m`}
                </span>
                <span
                  className={`text-[10px] font-mono leading-none mt-0.5 ${
                    isSelected ? 'text-sky-200 font-medium' : 'text-zinc-500'
                  }`}
                >
                  {rainVal} mm/h
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
