import { motion } from 'framer-motion';

const TYPE_STYLES = {
  system: 'text-text-muted',
  info: 'text-[#8b949e]',
  command: 'text-accent-green font-semibold',
  success: 'text-accent-cyan',
  error: 'text-accent-red',
  highlight: 'text-accent-brilliant font-semibold',
  divider: 'text-text-dim/30',
};

export default function TerminalLine({ type, text, index }) {
  const style = TYPE_STYLES[type] || 'text-text-primary';

  if (type === 'divider') {
    return (
      <div className="text-text-dim/20 select-none text-[11px]">
        {text}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
      className={`${style} whitespace-pre-wrap break-all`}
    >
      {text}
    </motion.div>
  );
}
