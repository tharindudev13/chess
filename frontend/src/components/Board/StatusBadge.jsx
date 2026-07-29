import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trophy, Handshake, Crown } from 'lucide-react';

const STATUS_CONFIG = {
  playing: null,
  check: {
    icon: AlertTriangle,
    text: 'IN CHECK',
    color: 'text-accent-yellow',
    bg: 'bg-accent-yellow/10 border-accent-yellow/30',
  },
  checkmate: {
    icon: Trophy,
    text: 'CHECKMATE!',
    color: 'text-accent-red',
    bg: 'bg-accent-red/10 border-accent-red/30',
  },
  draw: {
    icon: Handshake,
    text: 'DRAW',
    color: 'text-text-muted',
    bg: 'bg-bg-surface border-border-glass',
  },
  stalemate: {
    icon: Handshake,
    text: 'STALEMATE',
    color: 'text-text-muted',
    bg: 'bg-bg-surface border-border-glass',
  },
  timeout: {
    icon: AlertTriangle,
    text: 'TIME OUT',
    color: 'text-accent-red',
    bg: 'bg-accent-red/10 border-accent-red/30',
  },
};

export default function StatusBadge({ status, turn, timeoutColor }) {
  const config = STATUS_CONFIG[status];
  const turnLabel = turn === 'w' ? "White's Turn" : "Black's Turn";

  return (
    <div className="flex items-center gap-2">
      {/* Turn indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface/60 border border-border-glass">
        <div className={`w-3 h-3 rounded-full ${turn === 'w' ? 'bg-white' : 'bg-[#1a1a1a] border border-white/30'}`} />
        <span className="text-sm font-medium text-text-primary font-heading">
          {status === 'timeout'
            ? `${timeoutColor === 'w' ? 'White' : 'Black'} Timed Out`
            : status === 'checkmate'
              ? `${turn === 'w' ? 'Black' : 'White'} Wins!`
              : turnLabel
          }
        </span>
      </div>

      {/* Status alert */}
      <AnimatePresence mode="wait">
        {config && (
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.85, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${config.bg}`}
          >
            <config.icon size={14} className={config.color} />
            <span className={`text-sm font-bold font-heading tracking-wide ${config.color}`}>
              {config.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
