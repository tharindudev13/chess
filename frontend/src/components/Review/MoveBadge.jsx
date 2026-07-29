import { motion } from 'framer-motion';
import { QUALITY_COLORS, QUALITY_CLASS } from '../../utils/constants';

export default function MoveBadge({ move, index, isSelected, onClick }) {
  const quality = move.quality || 'Book/Standard';
  const color = QUALITY_COLORS[quality] || '#9e9b97';
  const cls = QUALITY_CLASS[quality] || 'book';

  return (
    <motion.button
      onClick={onClick}
      className={`relative px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all duration-200 quality-bg-${cls} ${
        isSelected
          ? 'ring-2 ring-offset-1 ring-offset-bg-deep'
          : 'hover:brightness-125'
      }`}
      style={{
        borderColor: isSelected ? color : undefined,
        ringColor: isSelected ? color : undefined,
        boxShadow: isSelected ? `0 0 12px ${color}30` : undefined,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span style={{ color }}>{move.num}</span>
      {/* Quality dot */}
      <span
        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </motion.button>
  );
}
