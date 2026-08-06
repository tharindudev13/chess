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
  const [moveBadge, setMoveBadge] = useState(null);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [reviewPlayers, setReviewPlayers] = useState({ white: null, black: null });
  const [timeoutColor, setTimeoutColor] = useState(null);
  const [gameOverReason, setGameOverReason] = useState(null);
  const [linkedUsername, setLinkedUsername] = useState(localStorage.getItem('chesscom_username') || '');
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

  // Restrict "Next Move" tab strictly to username "tharindudev"
  const showNextMove = linkedUsername.trim().toLowerCase() === 'tharindudev';

  // Automatically fall back to arena if user loses authorization for terminal
  useEffect(() => {
    if (activeTab === 'terminal' && !showNextMove) {
      setActiveTab('arena');
    }
  }, [activeTab, showNextMove]);

  // Clear board highlights & badges when switching tabs
  const handleTabChange = useCallback((tab) => {
    setHintSquares(null);
    setMoveBadge(null);
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
        .catch(() => {});
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fen]);

  // Handle piece drop on board
  const handlePieceDrop = useCallback(
    (sourceSquare, targetSquare) => {
      const move = makeMove(sourceSquare, targetSquare);
      if (move) {
        setHintSquares(null);
        setMoveBadge(null);
        return true;
      }
      return false;
    },
    [makeMove]
  );

  // Handle move execution from Match Arena
  const handleEngineMove = useCallback(
    (moveUci) => {
      const move = makeMoveUci(moveUci);
      if (move) {
        setHintSquares(null);
        setMoveBadge(null);
      }
    },
    [makeMoveUci]
  );

  // Handle reset game
  const handleReset = useCallback(() => {
    reset();
    setEvaluation(null);
    setHintSquares(null);
    setMoveBadge(null);
    setTimeoutColor(null);
    setGameOverReason(null);
  }, [reset]);

  // Handle clock timeout
  const handleTimeout = useCallback((loserColor) => {
    setTimeoutColor(loserColor);
    setGameOverReason('timeout');
  }, []);

  // Handle hint squares from Next Move Terminal
  const handleHintSquares = useCallback((squares) => {
    setHintSquares(squares);
  }, []);

  // Handle loading specific FEN (from review timeline or terminal)
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
              <EvalBar evaluation={evaluation} boardOrientation={boardOrientation} />
              <div className="flex-1">
                <ChessBoardView
                  fen={fen}
                  onPieceDrop={handlePieceDrop}
                  boardOrientation={boardOrientation}
                  getLegalMoves={getLegalMoves}
                  hintSquares={hintSquares}
                  lastMove={lastMove}
                  moveBadge={activeTab === 'review' ? moveBadge : null}
                  allowMoves={!isOver}
                  turn={currentTurn}
                />
              </div>
            </div>

            {/* Player Badges */}
            <div className="flex flex-col gap-1.5">
              <PlayerBadge
                color={boardOrientation === 'black' ? 'w' : 'b'}
                name={
                  (boardOrientation === 'black'
                    ? (activeTab === 'review' && reviewPlayers.white) || 'White'
                    : (activeTab === 'review' && reviewPlayers.black) || 'Black')
                }
                isActive={currentTurn === (boardOrientation === 'black' ? 'w' : 'b') && !isOver}
              />
              <PlayerBadge
                color={boardOrientation === 'black' ? 'b' : 'w'}
                name={
                  (boardOrientation === 'black'
                    ? (activeTab === 'review' && reviewPlayers.black) || 'Black'
                    : (activeTab === 'review' && reviewPlayers.white) || 'White')
                }
                isActive={currentTurn === (boardOrientation === 'black' ? 'b' : 'w') && !isOver}
              />
            </div>
          </>
        }
        rightColumn={
          <>
            {/* Tab Navigation */}
            <NavTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              showNextMove={showNextMove}
            />

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

              {activeTab === 'terminal' && showNextMove && (
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
                    onLoadFen={handleLoadFen}
                    onOrientationChange={setBoardOrientation}
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
                    onLoadBadge={setMoveBadge}
                    onOrientationChange={setBoardOrientation}
                    onPlayersChange={setReviewPlayers}
                    onUsernameChange={setLinkedUsername}
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
