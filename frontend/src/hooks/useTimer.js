import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer(initialTimeSec, onTimeout) {
  const [whiteTime, setWhiteTime] = useState(initialTimeSec ? initialTimeSec * 1000 : null);
  const [blackTime, setBlackTime] = useState(initialTimeSec ? initialTimeSec * 1000 : null);
  const [activeClock, setActiveClock] = useState(null); // 'w' | 'b' | null
  const [isRunning, setIsRunning] = useState(false);

  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const activeClockRef = useRef(activeClock);
  activeClockRef.current = activeClock;

  const isUnlimited = initialTimeSec === null;
  const lastTickRef = useRef(null);

  // Interval timer tick effect
  useEffect(() => {
    if (!isRunning || !activeClock || isUnlimited) return;

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current || now);
      lastTickRef.current = now;

      const currentActive = activeClockRef.current;
      if (currentActive === 'w') {
        setWhiteTime((prev) => {
          if (prev === null) return null;
          const next = Math.max(0, prev - delta);
          if (next <= 0) {
            onTimeoutRef.current?.('w');
            setIsRunning(false);
            setActiveClock(null);
          }
          return next;
        });
      } else if (currentActive === 'b') {
        setBlackTime((prev) => {
          if (prev === null) return null;
          const next = Math.max(0, prev - delta);
          if (next <= 0) {
            onTimeoutRef.current?.('b');
            setIsRunning(false);
            setActiveClock(null);
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, activeClock, isUnlimited]);

  const start = useCallback((color = 'w') => {
    setActiveClock(color);
    setIsRunning(true);
  }, []);

  const switchClock = useCallback((newColor) => {
    lastTickRef.current = Date.now();
    if (newColor) {
      setActiveClock(newColor);
    } else {
      setActiveClock((prev) => (prev === 'w' ? 'b' : 'w'));
    }
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback((timeSec) => {
    setIsRunning(false);
    setActiveClock(null);
    setWhiteTime(timeSec ? timeSec * 1000 : null);
    setBlackTime(timeSec ? timeSec * 1000 : null);
    lastTickRef.current = null;
  }, []);

  const formatTime = useCallback((ms) => {
    if (ms === null) return '∞';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  return {
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
  };
}
