import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

interface TimeSliderProps {
  timeOffsetMin: number;
  onTimeChange: (newTime: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  rainfallMultiplier: number;
}

const HORIZONS = [0, 30, 60, 90, 120, 180];
const BASE_RAINFALL = {
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
    (BASE_RAINFALL[timeOffsetMin as keyof typeof BASE_RAINFALL] || 45) * rainfallMultiplier
  );

  const handleStep = (direction: 'prev' | 'next') => {
    const currentIndex = HORIZONS.indexOf(timeOffsetMin);
    if (direction === 'prev' && currentIndex > 0) {
      onTimeChange(HORIZONS[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < HORIZONS.length - 1) {
      onTimeChange(HORIZONS[currentIndex + 1]);
    }
  };

  return (
    <div className="bg-[#0f172a]/95 backdrop-blur-md border border-[#23354e] rounded-2xl px-4 py-2.5 shadow-2xl flex flex-col md:flex-row items-center gap-3.5 select-none">
      {/* Playback Controls */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => handleStep('prev')}
          disabled={timeOffsetMin === 0}
          className="p-1.5 rounded-lg bg-[#142034] hover:bg-[#1e2f4a] disabled:opacity-30 text-slate-200 transition cursor-pointer border border-[#20324c]"
          title="Previous Time Step"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`px-3 py-1.5 rounded-lg flex items-center justify-center font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer text-xs gap-1.5 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
          title={isPlaying ? 'Pause Forecast Animation' : 'Play 0–3 Hour Forecast Timeline'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play 0–3h</span>
            </>
          )}
        </button>

        <button
          onClick={() => handleStep('next')}
          disabled={timeOffsetMin === 180}
          className="p-1.5 rounded-lg bg-[#142034] hover:bg-[#1e2f4a] disabled:opacity-30 text-slate-200 transition cursor-pointer border border-[#20324c]"
          title="Next Time Step"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timeline Steps */}
      <div className="flex-1 w-full flex flex-col space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Flood Forecast Timeline (0–3 Hours)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-medium">Horizon:</span>
            <span className="text-blue-300 font-mono font-bold">
              {timeOffsetMin === 0 ? 'CURRENT (T+0)' : `T+${timeOffsetMin} min`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1">
          {HORIZONS.map((step) => {
            const isSelected = timeOffsetMin === step;
            const isCurrent = step === 0;
            const rainVal = Math.round(
              (BASE_RAINFALL[step as keyof typeof BASE_RAINFALL] || 0) * rainfallMultiplier
            );

            return (
              <button
                key={step}
                onClick={() => onTimeChange(step)}
                className={`py-1 px-1.5 rounded-lg text-center transition cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-sm'
                    : 'bg-[#121c2e] hover:bg-[#18263e] text-slate-200 border-[#1f304a]'
                }`}
              >
                <div className="text-[11px] font-mono font-semibold">
                  {isCurrent ? 'CURRENT' : `T+${step}m`}
                </div>
                <div className={`text-[9px] font-mono font-medium ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {rainVal} mm/h
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rainfall Badge */}
      <div className="hidden sm:flex items-center space-x-2 bg-[#121c2e] px-3 py-1.5 rounded-xl border border-[#1f304a] text-xs">
        <div>
          <div className="text-[10px] text-slate-300 font-medium">Rainfall Nowcast</div>
          <div className="text-xs font-bold font-mono text-blue-300">
            {currentRain} <span className="text-[10px] font-normal text-slate-300">mm/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
