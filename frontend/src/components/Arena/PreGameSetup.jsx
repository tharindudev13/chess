import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Users, Play, Clock } from 'lucide-react';
import { TIME_CONTROLS } from '../../utils/constants';

export default function PreGameSetup({ gameMode, onGameModeChange, onStart }) {
  const [selectedTime, setSelectedTime] = useState(2); // index into TIME_CONTROLS (5 min)

  return (
    <div className="space-y-5">
      {/* Game Mode Toggle */}
      <div>
        <label className="text-xs font-heading text-text-muted tracking-wider uppercase mb-2 block">
          Game Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'bot', label: 'Play Machine', icon: Bot, desc: 'vs Stockfish AI' },
            { id: 'local', label: 'Pass & Play', icon: Users, desc: '2 Players Local' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => onGameModeChange(mode.id)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                gameMode === mode.id
                  ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                  : 'bg-bg-surface/40 border-border-glass text-text-muted hover:border-white/15 hover:text-text-primary'
              }`}
            >
              <mode.icon size={20} />
              <span className="text-sm font-semibold font-heading">{mode.label}</span>
              <span className="text-[10px] opacity-60">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Control */}
      <div>
        <label className="text-xs font-heading text-text-muted tracking-wider uppercase mb-2 flex items-center gap-1.5">
          <Clock size={12} />
          Time Control
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_CONTROLS.map((tc, i) => (
            <button
              key={i}
              onClick={() => setSelectedTime(i)}
              className={`relative flex flex-col items-center py-2.5 px-2 rounded-lg border transition-all duration-200 ${
                selectedTime === i
                  ? 'bg-accent-green/10 border-accent-green/30'
                  : 'bg-bg-surface/30 border-border-glass hover:border-white/12'
              }`}
            >
              {selectedTime === i && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-accent-green/5"
                  layoutId="timeSelect"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative text-lg font-bold font-heading ${
                selectedTime === i ? 'text-accent-green' : 'text-text-primary'
              }`}>
                {tc.label}
              </span>
              <span className={`relative text-[10px] ${
                selectedTime === i ? 'text-accent-green/70' : 'text-text-dim'
              }`}>
                {tc.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <motion.button
        onClick={() => onStart(TIME_CONTROLS[selectedTime].value, gameMode)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-green text-[#161512] text-sm font-bold font-heading tracking-wider uppercase shadow-lg shadow-accent-green/20 hover:shadow-accent-green/30 transition-shadow duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Play size={16} />
        Start Match
      </motion.button>
    </div>
  );
}
