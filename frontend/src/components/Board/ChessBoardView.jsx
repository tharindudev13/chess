import { useState, useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';

export default function ChessBoardView({
  fen,
  onPieceDrop,
  boardOrientation = 'white',
  getLegalMoves,
  hintSquares,
  lastMove,
  allowMoves = true,
  turn,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);

  // Handle square click (for click-to-move)
  const onSquareClick = useCallback(({ square }) => {
    if (!allowMoves) return;

    // If a piece is already selected, try to move to clicked square
    if (selectedSquare) {
      if (legalTargets.some((m) => m.to === square)) {
        const success = onPieceDrop(selectedSquare, square);
        if (success) {
          setSelectedSquare(null);
          setLegalTargets([]);
          return;
        }
      }
    }

    // Select new piece — get its legal moves
    const moves = getLegalMoves(square);
    if (moves.length > 0) {
      setSelectedSquare(square);
      setLegalTargets(moves);
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  }, [selectedSquare, legalTargets, getLegalMoves, onPieceDrop, allowMoves]);

  // Handle drag-and-drop (v5 API: receives { piece, sourceSquare, targetSquare })
  const handlePieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!allowMoves) return false;
    if (!targetSquare) return false;

    const result = onPieceDrop(sourceSquare, targetSquare);
    setSelectedSquare(null);
    setLegalTargets([]);
    return !!result;
  }, [onPieceDrop, allowMoves]);

  // Build custom square styles
  const squareStyles = useMemo(() => {
    const styles = {};

    // Selected square highlight
    if (selectedSquare) {
      styles[selectedSquare] = {
        background: 'rgba(129, 182, 76, 0.45)',
      };
    }

    // Legal move target indicators
    legalTargets.forEach((move) => {
      const isCapture = move.captured;
      styles[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, transparent 55%, rgba(129, 182, 76, 0.45) 55%)'
          : 'radial-gradient(circle, rgba(129, 182, 76, 0.35) 25%, transparent 25%)',
      };
    });

    // Last move highlight (yellow tint)
    if (lastMove) {
      styles[lastMove.from] = {
        ...styles[lastMove.from],
        background: 'rgba(255, 255, 0, 0.18)',
      };
      styles[lastMove.to] = {
        ...styles[lastMove.to],
        background: 'rgba(255, 255, 0, 0.25)',
      };
    }

    // Hint squares (cyan glow) from Next Move Terminal
    if (hintSquares) {
      if (hintSquares.from) {
        styles[hintSquares.from] = {
          ...styles[hintSquares.from],
          background: 'rgba(0, 188, 212, 0.35)',
          boxShadow: 'inset 0 0 14px rgba(0, 188, 212, 0.5)',
        };
      }
      if (hintSquares.to) {
        styles[hintSquares.to] = {
          ...styles[hintSquares.to],
          background: 'rgba(0, 188, 212, 0.35)',
          boxShadow: 'inset 0 0 14px rgba(0, 188, 212, 0.5)',
        };
      }
    }

    return styles;
  }, [selectedSquare, legalTargets, lastMove, hintSquares]);

  // v5 API: canDragPiece receives { piece: { pieceType }, isSparePiece, square }
  // pieceType is a string like 'wP', 'bK', etc. First char is color.
  const canDragPiece = useCallback(({ piece }) => {
    if (!allowMoves) return false;
    const pieceColor = piece.pieceType[0];
    return pieceColor === turn;
  }, [allowMoves, turn]);

  return (
    <div className="relative w-full aspect-square">
      <Chessboard
        options={{
          id: 'main-board',
          position: fen,
          onPieceDrop: handlePieceDrop,
          onSquareClick: onSquareClick,
          boardOrientation: boardOrientation,
          squareStyles: squareStyles,
          boardStyle: {
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          darkSquareStyle: { backgroundColor: '#779952' },
          lightSquareStyle: { backgroundColor: '#edeed1' },
          canDragPiece: canDragPiece,
          animationDurationInMs: 200,
        }}
      />
    </div>
  );
}
