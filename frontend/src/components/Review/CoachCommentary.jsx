import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, TrendingDown } from 'lucide-react';
import { QUALITY_COLORS } from '../../utils/constants';

export default function CoachCommentary({ move }) {
  if (!move) return null;

  const quality = move.quality || 'Book';
  const color = QUALITY_COLORS[quality] || '#9e9b97';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${move.num}-${move.quality}-${move.explanation}`}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -6 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="glass-card p-4 space-y-3"
      >
        {/* Header: Quality + CPL */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="px-2.5 py-1 rounded-md text-xs font-bold font-heading tracking-wider uppercase"
              style={{
                backgroundColor: `${color}18`,
                color: color,
                border: `1px solid ${color}30`,
              }}
            >
              {quality}
            </motion.span>
            <span className="text-sm font-heading font-semibold text-text-primary">
              {move.num}
            </span>
          </div>

          {move.cpl_loss !== undefined && (
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <TrendingDown size={12} />
              <span className="font-mono">
                CPL: {move.cpl_loss > 0 ? `−${move.cpl_loss}` : move.cpl_loss}
              </span>
            </div>
          )}
        </div>

        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="flex gap-2"
        >
          <MessageSquare size={14} className="text-text-dim mt-0.5 flex-shrink-0" />
          <p className="text-sm text-text-muted leading-relaxed">
            {move.explanation}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
