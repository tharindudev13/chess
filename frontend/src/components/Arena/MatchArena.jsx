import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, RotateCcw, Zap, Play, Swords } from 'lucide-react';
import WindowFrame from '../Layout/WindowFrame';
import PreGameSetup from './PreGameSetup';
import ChessClock from './ChessClock';
import { getEngineMove } from '../../api';

export default function MatchArena({
  fen,
  turn,
  gameStatus,
  isGameOver,
  onMakeMove,
  onReset,
  onTimeout,
  addToast,
}) {
  const [gameMode, setGameMode] = useState('bot'); // 'bot' | 'local'
  const [isSetup, setIsSetup] = useState(true); // show pre-game setup
  const [timeControl, setTimeControl] = useState(null); // seconds or null
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Auto-trigger engine for bot mode
  useEffect(() => {
    if (
      gameMode === 'bot' &&
      !isSetup &&
      turn() === 'b' &&
      !isGameOver() &&
      !isEngineThinking &&
      !hasTriggeredRef.current
    ) {
      hasTriggeredRef.current = true;
      triggerEngine();
    }
  }, [fen, gameMode, isSetup]);

  // Reset the trigger guard whenever it's white's turn
  useEffect(() => {
    if (turn() === 'w') {
      hasTriggeredRef.current = false;
    }
  }, [fen]);

  const triggerEngine = useCallback(async () => {
    setIsEngineThinking(true);
    try {
      // Realistic delay
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 200));
      const data = await getEngineMove(fen);
      if (data.move) {
        onMakeMove(data.move.slice(0, 2), data.move.slice(2, 4));
      }
    } catch (err) {
      addToast?.('Engine Error: ' + err.message, 'error');
    } finally {
      setIsEngineThinking(false);
    }
  }, [fen, onMakeMove, addToast]);

  const handleStartGame = useCallback((time, mode) => {
    setTimeControl(time);
    setGameMode(mode);
    setIsSetup(false);
    onReset();
  }, [onReset]);

  const handleReset = useCallback(() => {
    setIsSetup(true);
    setIsEngineThinking(false);
    hasTriggeredRef.current = false;
    onReset();
  }, [onReset]);

  return (
    <WindowFrame
      title="Match Arena"
      icon={<Swords size={16} />}
    >
      <div className="p-4 space-y-4">
        <AnimatePresence mode="wait">
          {isSetup ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <PreGameSetup
                gameMode={gameMode}
                onGameModeChange={setGameMode}
                onStart={handleStartGame}
              />
            </motion.div>
          ) : (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Game Mode Badge */}
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-heading tracking-wider ${
                  gameMode === 'bot'
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                    : 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                }`}>
                  {gameMode === 'bot' ? <Bot size={12} /> : <Users size={12} />}
                  {gameMode === 'bot' ? 'VS MACHINE' : 'PASS & PLAY'}
                </span>
              </div>

              {/* Chess Clocks */}
              <ChessClock
                timeControl={timeControl}
                turn={turn()}
                gameStatus={gameStatus()}
                isGameOver={isGameOver()}
                onTimeout={onTimeout}
              />

              {/* Engine Status */}
              {gameMode === 'bot' && isEngineThinking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-cyan/5 border border-accent-cyan/15"
                >
                  <div className="w-3 h-3 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-accent-cyan font-mono">Stockfish thinking...</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {gameMode === 'bot' && turn() === 'b' && !isGameOver() && (
                  <button
                    onClick={triggerEngine}
                    disabled={isEngineThinking}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-sm font-semibold hover:bg-accent-cyan/20 transition-all duration-200 disabled:opacity-40"
                  >
                    <Zap size={14} />
                    Trigger Engine
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-bg-surface border border-border-glass text-text-muted text-sm font-medium hover:text-text-primary hover:border-white/15 transition-all duration-200"
                >
                  <RotateCcw size={14} />
                  New Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WindowFrame>
  );
}

