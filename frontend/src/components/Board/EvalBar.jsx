import { motion } from 'framer-motion';

export default function EvalBar({ evaluation }) {
  // evaluation: { type: 'cp' | 'mate', value: number }
  // Convert to percentage: 50% = even, 100% = white winning, 0% = black winning

  let whitePercent = 50;
  let displayText = '0.0';

  if (evaluation) {
    if (evaluation.type === 'mate') {
      whitePercent = evaluation.value > 0 ? 96 : 4;
      displayText = `M${Math.abs(evaluation.value)}`;
    } else {
      // Clamp centipawns to ±500 for display
      const cp = Math.max(-500, Math.min(500, evaluation.value));
      whitePercent = 50 + (cp / 500) * 45; // Maps -500..500 to 5..95
      displayText = (evaluation.value / 100).toFixed(1);
      if (evaluation.value > 0) displayText = `+${displayText}`;
    }
  }

  const isWhiteAhead = whitePercent >= 50;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <span className="text-[10px] font-mono text-text-dim font-bold">B</span>
      <div className="relative w-7 h-full min-h-[320px] rounded-md bg-white overflow-hidden border border-border-glass shadow-inner">
        {/* Black (top) fill */}
        <motion.div
          className="absolute top-0 left-0 right-0 bg-[#1e1e1e]"
          animate={{ height: `${100 - whitePercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        {/* Eval text indicator (positioned in the leading side zone to guarantee 100% contrast) */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-1.5 pointer-events-none">
          {/* Black score (if Black is leading) */}
          <div className="flex justify-center">
            {!isWhiteAhead && (
              <span className="text-[10px] font-mono font-bold text-white drop-shadow-sm">
                {displayText}
              </span>
            )}
          </div>

          {/* White score (if White is leading or equal) */}
          <div className="flex justify-center">
            {isWhiteAhead && (
              <span className="text-[10px] font-mono font-bold text-[#161512] drop-shadow-sm">
                {displayText}
              </span>
            )}
          </div>
        </div>
      </div>
      <span className="text-[10px] font-mono text-text-dim font-bold">W</span>
    </div>
  );
}
