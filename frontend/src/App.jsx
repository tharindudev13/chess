import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Workspace from './components/Layout/Workspace';
import NavTabs from './components/Layout/NavTabs';
import ChessBoardView from './components/Board/ChessBoardView';
import EvalBar from './components/Board/EvalBar';
import StatusBadge from './components/Board/StatusBadge';
import PlayerBadge from './components/Board/PlayerBadge';
import MatchArena from './components/Arena/MatchArena';
import NextMoveTerminal from './components/Terminal/NextMoveTerminal';
import ReviewPanel from './components/Review/ReviewPanel';
import { useChessGame } from './hooks/useChessGame';
import { useToast } from './components/ui/Toast';
import { getEngineSuggestion } from './api';

const TAB_VARIANTS = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('arena');
  const [evaluation, setEvaluation] = useState(null);
  const [hintSquares, setHintSquares] = useState(null);
  const [timeoutColor, setTimeoutColor] = useState(null);
  const [gameOverReason, setGameOverReason] = useState(null);
  const { addToast, ToastContainer } = useToast();

  const {
    fen,
    lastMove,
    turn,
    gameStatus,
    isGameOver,
    makeMove,
    makeMoveUci,
    getLegalMoves,
    loadFen,
    reset,
  } = useChessGame();

  // Clear board highlights when switching tabs
  const handleTabChange = useCallback((tab) => {
    setHintSquares(null);
    setActiveTab(tab);
  }, []);

  // Automatically update Stockfish position evaluation whenever the board FEN changes (debounced 150ms)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      getEngineSuggestion({ fen })
        .then((data) => {
          if (isMounted && data.evaluation) {
            setEvaluation(data.evaluation);
          }
        })
        .catch(() => {
          // Silent catch for end of game or busy backend
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fen]);

  // Handle piece drop / click move
  const handlePieceDrop = useCallback((from, to) => {
    // Clear hints when making a move
    setHintSquares(null);

    const result = makeMove(from, to);
    if (!result) {
      addToast('Illegal move', 'warning');
    }
    return result;
  }, [makeMove, addToast]);

  // Handle engine move (for bot play)
  const handleEngineMove = useCallback((from, to) => {
    return makeMove(from, to);
  }, [makeMove]);

  // Handle timeout
  const handleTimeout = useCallback((color) => {
    setTimeoutColor(color);
    setGameOverReason('timeout');
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    reset();
    setEvaluation(null);
    setHintSquares(null);
    setTimeoutColor(null);
    setGameOverReason(null);
  }, [reset]);

  // Handle hint squares from terminal
  const handleHintSquares = useCallback((squares) => {
    setHintSquares(squares);
  }, []);

  // Handle FEN load from review
  const handleLoadFen = useCallback((newFen) => {
    loadFen(newFen);
  }, [loadFen]);

  // Derive current status
  const currentStatus = gameOverReason === 'timeout' ? 'timeout' : gameStatus();
  const currentTurn = turn();
  const isOver = isGameOver() || gameOverReason === 'timeout';

  return (
    <>
      <ToastContainer />
      <Workspace
        leftColumn={
          <>
            {/* Status Badge */}
            <StatusBadge
              status={currentStatus}
              turn={currentTurn}
              timeoutColor={timeoutColor}
            />

            {/* Board + Eval Bar */}
            <div className="flex gap-3 items-stretch">
              <EvalBar evaluation={evaluation} />
              <div className="flex-1">
                <ChessBoardView
                  fen={fen}
                  onPieceDrop={handlePieceDrop}
                  getLegalMoves={getLegalMoves}
                  hintSquares={hintSquares}
                  lastMove={lastMove}
                  allowMoves={!isOver}
                  turn={currentTurn}
                />
              </div>
            </div>

            {/* Player Badges */}
            <div className="flex flex-col gap-1.5">
              <PlayerBadge
                color="b"
                name="Black"
                isActive={currentTurn === 'b' && !isOver}
              />
              <PlayerBadge
                color="w"
                name="White"
                isActive={currentTurn === 'w' && !isOver}
              />
            </div>
          </>
        }
        rightColumn={
          <>
            {/* Tab Navigation */}
            <NavTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'arena' && (
                <motion.div
                  key="arena"
                  variants={TAB_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <MatchArena
                    fen={fen}
                    turn={turn}
                    gameStatus={gameStatus}
                    isGameOver={() => isOver}
                    onMakeMove={handleEngineMove}
                    onReset={handleReset}
                    onTimeout={handleTimeout}
                    addToast={addToast}
                  />
                </motion.div>
              )}

              {activeTab === 'terminal' && (
                <motion.div
                  key="terminal"
                  variants={TAB_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <NextMoveTerminal
                    fen={fen}
                    onHintSquares={handleHintSquares}
                    addToast={addToast}
                  />
                </motion.div>
              )}

              {activeTab === 'review' && (
                <motion.div
                  key="review"
                  variants={TAB_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <ReviewPanel
                    onLoadFen={handleLoadFen}
                    addToast={addToast}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        }
      />
    </>
  );
}
