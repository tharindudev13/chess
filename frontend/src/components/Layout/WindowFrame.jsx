import { motion } from 'framer-motion';

export default function WindowFrame({ title, icon, variant = 'default', children, actions }) {
  const isMacTerminal = variant === 'terminal';

  return (
    <motion.div
      className={isMacTerminal ? 'macos-window' : 'glass-panel overflow-hidden'}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Title Bar */}
      <div className={isMacTerminal ? 'macos-titlebar' : 'flex items-center px-4 py-3 border-b border-border-glass bg-bg-elevated/50'}>
        {isMacTerminal && (
          <div className="flex items-center gap-[6px] mr-3">
            <span className="traffic-light traffic-red" />
            <span className="traffic-light traffic-yellow" />
            <span className="traffic-light traffic-green" />
          </div>
        )}

        {icon && <span className="text-text-muted mr-2">{icon}</span>}

        <span className={`font-heading text-sm font-semibold tracking-wider uppercase ${isMacTerminal ? 'text-text-muted text-xs' : 'text-text-primary'}`}>
          {title}
        </span>

        {isMacTerminal && (
          <span className="ml-2 text-[10px] text-text-dim font-mono">
            — user@chess-ai
          </span>
        )}

        {actions && (
          <div className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={isMacTerminal ? 'bg-bg-terminal' : ''}>
        {children}
      </div>
    </motion.div>
  );
}
