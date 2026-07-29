import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';

export function useChessGame(initialFen) {
  const gameRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  const updateState = useCallback(() => {
    setFen(gameRef.current.fen());
    setHistory([...gameRef.current.history({ verbose: true })]);
  }, []);

  const turn = useCallback(() => gameRef.current.turn(), [fen]);

  const gameStatus = useCallback(() => {
    const g = gameRef.current;
    if (g.isCheckmate()) return 'checkmate';
    if (g.isDraw()) return 'draw';
    if (g.isStalemate()) return 'stalemate';
    if (g.isThreefoldRepetition()) return 'draw';
    if (g.isInsufficientMaterial()) return 'draw';
    if (g.isCheck()) return 'check';
    return 'playing';
  }, [fen]);

  const isGameOver = useCallback(() => gameRef.current.isGameOver(), [fen]);

  const makeMove = useCallback((from, to, promotion = 'q') => {
    try {
      const result = gameRef.current.move({ from, to, promotion });
      if (result) {
        setLastMove({ from, to });
        updateState();
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }, [updateState]);

  const makeMoveUci = useCallback((uci) => {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : 'q';
    return makeMove(from, to, promotion);
  }, [makeMove]);

  const getLegalMoves = useCallback((square) => {
    if (!square) return [];
    try {
      return gameRef.current.moves({ square, verbose: true });
    } catch {
      return [];
    }
  }, [fen]);

  const loadFen = useCallback((newFen) => {
    try {
      gameRef.current.load(newFen);
      setLastMove(null);
      updateState();
      return true;
    } catch {
      return false;
    }
  }, [updateState]);

  const reset = useCallback(() => {
    gameRef.current.reset();
    setLastMove(null);
    updateState();
  }, [updateState]);

  const loadPgn = useCallback((pgn) => {
    try {
      gameRef.current.loadPgn(pgn);
      setLastMove(null);
      updateState();
      return true;
    } catch {
      return false;
    }
  }, [updateState]);

  return {
    game: gameRef.current,
    fen,
    history,
    lastMove,
    turn,
    gameStatus,
    isGameOver,
    makeMove,
    makeMoveUci,
    getLegalMoves,
    loadFen,
    reset,
    loadPgn,
  };
}
