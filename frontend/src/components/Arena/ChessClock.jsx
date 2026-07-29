import { useEffect, useRef } from 'react';
import { useTimer } from '../../hooks/useTimer';

export default function ChessClock({ timeControl, turn, gameStatus, isGameOver, onTimeout }) {
  const {
    whiteTime,
    blackTime,
    activeClock,
    isRunning,
    isUnlimited,
    start,
    switchClock,
    pause,
    resetTimer,
    formatTime,
  } = useTimer(timeControl, onTimeout);

  const prevTimeControlRef = useRef(timeControl);

  // Reset timer if timeControl prop changes explicitly
  useEffect(() => {
    if (prevTimeControlRef.current !== timeControl) {
      prevTimeControlRef.current = timeControl;
      resetTimer(timeControl);
    }
  }, [timeControl, resetTimer]);

  // Start clock when game is playing and clock isn't started yet
  useEffect(() => {
    if (!isUnlimited && !isGameOver && (gameStatus === 'playing' || gameStatus === 'check')) {
      if (!isRunning && !activeClock) {
        start(turn || 'w');
      }
    }
  }, [gameStatus, isGameOver, isUnlimited, isRunning, activeClock, start, turn]);

  // Switch active clock when turn changes
  useEffect(() => {
    if (!isUnlimited && !isGameOver && isRunning) {
      if (activeClock && activeClock !== turn) {
        switchClock(turn);
      }
    }
  }, [turn, isRunning, isGameOver, activeClock, isUnlimited, switchClock]);

  // Pause on game over
  useEffect(() => {
    if (isGameOver && isRunning) {
      pause();
    }
  }, [isGameOver, isRunning, pause]);

  if (isUnlimited) {
    return null; // No clocks for unlimited
  }

  const getClockClass = (time, isActive) => {
    if (!isActive) return 'bg-bg-surface/40 border-border-glass';
    if (time <= 10000) return 'clock-danger';
    if (time <= 30000) return 'clock-warning';
    return 'clock-active';
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* White Clock */}
      <div className={`flex flex-col items-center py-3 px-4 rounded-xl border transition-all duration-300 ${getClockClass(whiteTime, activeClock === 'w')}`}>
        <span className="text-[10px] font-heading text-text-muted tracking-wider uppercase mb-1">White</span>
        <span className="text-2xl font-heading font-bold text-text-primary tabular-nums">
          {formatTime(whiteTime)}
        </span>
      </div>

      {/* Black Clock */}
      <div className={`flex flex-col items-center py-3 px-4 rounded-xl border transition-all duration-300 ${getClockClass(blackTime, activeClock === 'b')}`}>
        <span className="text-[10px] font-heading text-text-muted tracking-wider uppercase mb-1">Black</span>
        <span className="text-2xl font-heading font-bold text-text-primary tabular-nums">
          {formatTime(blackTime)}
        </span>
      </div>
    </div>
  );
}
