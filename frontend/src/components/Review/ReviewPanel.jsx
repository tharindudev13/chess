import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, FileText, AlertCircle } from 'lucide-react';
import WindowFrame from '../Layout/WindowFrame';
import MoveTimeline from './MoveTimeline';
import CoachCommentary from './CoachCommentary';
import SkeletonLoader from '../ui/SkeletonLoader';
import { reviewGame } from '../../api';

const SAMPLE_PGN = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O`;

export default function ReviewPanel({ onLoadFen, addToast }) {
  const [pgn, setPgn] = useState('');
  const [reviews, setReviews] = useState(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleReview = useCallback(async () => {
    if (!pgn.trim()) {
      addToast?.('Please enter PGN data', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReviews(null);
    setSelectedMoveIndex(null);

    try {
      const data = await reviewGame(pgn.trim());
      setReviews(data.reviews);
      if (data.reviews?.length > 0) {
        setSelectedMoveIndex(0);
        onLoadFen?.(data.reviews[0].fen);
      }
    } catch (err) {
      setError(err.message);
      addToast?.('Review failed: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pgn, onLoadFen, addToast]);

  const handleMoveSelect = useCallback((index) => {
    setSelectedMoveIndex(index);
    if (reviews?.[index]) {
      onLoadFen?.(reviews[index].fen);
    }
  }, [reviews, onLoadFen]);

  const selectedMove = reviews && selectedMoveIndex !== null ? reviews[selectedMoveIndex] : null;

  return (
    <WindowFrame
      title="AI Game Review Coach"
      icon={<FileText size={16} />}
    >
      <div className="p-4 space-y-4">
        <AnimatePresence mode="wait">
          {!reviews && !isLoading ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* PGN Input */}
              <div>
                <label className="text-xs font-heading text-text-muted tracking-wider uppercase mb-2 block">
                  Paste PGN Data
                </label>
                <textarea
                  value={pgn}
                  onChange={(e) => setPgn(e.target.value)}
                  placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 ..."
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-surface/60 border border-border-glass text-text-primary text-sm font-mono resize-none outline-none focus:border-accent-green/30 transition-colors placeholder:text-text-dim"
                />
              </div>

              {/* Sample PGN Button */}
              <button
                onClick={() => setPgn(SAMPLE_PGN)}
                className="text-xs text-text-dim hover:text-accent-cyan transition-colors"
              >
                Load sample PGN (Ruy Lopez)
              </button>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/10 border border-accent-red/20"
                >
                  <AlertCircle size={14} className="text-accent-red mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-accent-red">{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                onClick={handleReview}
                disabled={!pgn.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-green text-[#161512] text-sm font-bold font-heading tracking-wider uppercase shadow-lg shadow-accent-green/20 hover:shadow-accent-green/30 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                whileHover={{ scale: pgn.trim() ? 1.02 : 1 }}
                whileTap={{ scale: pgn.trim() ? 0.98 : 1 }}
              >
                <Rocket size={16} />
                Run Full Game Review
              </motion.button>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <SkeletonLoader lines={3} />
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-text-muted font-heading">Analyzing with Stockfish + Gemini AI...</span>
              </div>
              <SkeletonLoader lines={5} />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Move Timeline */}
              <MoveTimeline
                reviews={reviews}
                selectedIndex={selectedMoveIndex}
                onSelectMove={handleMoveSelect}
              />

              {/* Coach Commentary */}
              {selectedMove && (
                <CoachCommentary move={selectedMove} />
              )}

              {/* Back Button */}
              <button
                onClick={() => {
                  setReviews(null);
                  setSelectedMoveIndex(null);
                  setError(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-surface border border-border-glass text-text-muted text-sm font-medium hover:text-text-primary hover:border-white/15 transition-all duration-200"
              >
                Analyze Another Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WindowFrame>
  );
}
