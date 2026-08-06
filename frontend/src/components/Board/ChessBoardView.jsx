import { useState, useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';

function MoveBadgeIcon({ quality }) {
  switch (quality) {
    case 'Brilliant':
      return (
        <span className="w-5 h-5 rounded-full bg-cyan-500 text-white font-black text-[10px] flex items-center justify-center shadow-lg border border-white/40 animate-bounce">
          !!
        </span>
      );
    case 'Great Move':
      return (
        <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black text-[11px] flex items-center justify-center shadow-lg border border-white/40">
          !
        </span>
      );
    case 'Best Move':
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg border border-white/40">
          ★
        </span>
      );
    case 'Excellent':
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shadow-lg border border-white/40">
          ✓
        </span>
      );
    case 'Good Move':
      return (
        <span className="w-5 h-5 rounded-full bg-lime-500 text-slate-950 font-bold text-[11px] flex items-center justify-center shadow-lg border border-black/30">
          ✓
        </span>
      );
    case 'Forced':
      return (
        <span className="w-5 h-5 rounded-full bg-slate-500 text-white font-bold text-[11px] flex items-center justify-center shadow-lg border border-white/40">
          ➔
        </span>
      );
    case 'Book':
      return (
        <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] flex items-center justify-center shadow-lg border border-white/40">
          📖
        </span>
      );
    case 'Inaccuracy':
      return (
        <span className="w-5 h-5 rounded-full bg-yellow-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-lg border border-black/30">
          ?!
        </span>
      );
    case 'Mistake':
      return (
        <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[11px] flex items-center justify-center shadow-lg border border-white/40">
          ?
        </span>
      );
    case 'Miss':
      return (
        <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg border border-white/40">
          ✖
        </span>
      );
    case 'Blunder':
      return (
        <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center shadow-lg border border-white/40">
          ??
        </span>
      );
    default:
      return null;
  }
}

export default function ChessBoardView({
  fen,
  onPieceDrop,
  boardOrientation = 'white',
  getLegalMoves,
  hintSquares,
  lastMove,
  moveBadge,
  allowMoves = true,
  turn,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);

  // Calculate badge coordinates on top-right of target square
  const badgeCoords = useMemo(() => {
    if (!moveBadge || !moveBadge.square || moveBadge.square.length < 2) return null;
    const file = moveBadge.square[0].toLowerCase();
    const rank = parseInt(moveBadge.square[1], 10);
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fileIdx = files.indexOf(file);
    if (fileIdx === -1 || isNaN(rank)) return null;

    let left = 0;
    let top = 0;

    if (boardOrientation === 'black') {
      left = ((7 - fileIdx) / 8) * 100;
      top = ((rank - 1) / 8) * 100;
    } else {
      left = (fileIdx / 8) * 100;
      top = ((8 - rank) / 8) * 100;
    }

    return { left, top };
  }, [moveBadge, boardOrientation]);

  // Handle square click (for click-to-move)
  const onSquareClick = useCallback(({ square }) => {
    if (!allowMoves) return;

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

    const moves = getLegalMoves(square);
    if (moves.length > 0) {
      setSelectedSquare(square);
      setLegalTargets(moves);
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  }, [selectedSquare, legalTargets, getLegalMoves, onPieceDrop, allowMoves]);

  // Handle drag-and-drop
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

    if (selectedSquare) {
      styles[selectedSquare] = {
        background: 'rgba(186, 202, 68, 0.55)',
      };
    }

    legalTargets.forEach((move) => {
      const isCapture = move.captured;
      styles[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, transparent 52%, rgba(0, 0, 0, 0.22) 52%, rgba(0, 0, 0, 0.22) 65%, transparent 65%)'
          : 'radial-gradient(circle, rgba(0, 0, 0, 0.22) 18%, transparent 19%)',
      };
    });

    if (lastMove) {
      styles[lastMove.from] = {
        ...styles[lastMove.from],
        background: 'rgba(247, 247, 105, 0.4)',
      };
      styles[lastMove.to] = {
        ...styles[lastMove.to],
        background: 'rgba(247, 247, 105, 0.4)',
      };
    }

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
          boardOrientation: boardOrientation,
          squareStyles: squareStyles,
          boardStyle: {
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          darkSquareStyle: { backgroundColor: '#779952' },
          lightSquareStyle: { backgroundColor: '#edeed1' },
          allowDragging: allowMoves,
          animationDurationInMs: 200,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            handlePieceDrop({ sourceSquare, targetSquare }),
          onSquareClick: ({ square }) => onSquareClick({ square }),
          canDragPiece: canDragPiece,
        }}
      />

      {/* On-Board Move Quality Badge Overlay (Top-Right of target square) */}
      {moveBadge && badgeCoords && (
        <div
          style={{
            position: 'absolute',
            left: `${badgeCoords.left}%`,
            top: `${badgeCoords.top}%`,
            width: '12.5%',
            height: '12.5%',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          className="flex items-start justify-end p-0.5"
        >
          <MoveBadgeIcon quality={moveBadge.quality} />
        </div>
      )}
    </div>
  );
}
