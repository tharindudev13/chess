import { motion } from 'framer-motion';
import { Swords, Terminal, BookOpen } from 'lucide-react';

const TABS = [
  { id: 'arena', label: 'Match Arena', icon: Swords },
  { id: 'terminal', label: 'Next Move', icon: Terminal },
  { id: 'review', label: 'Game Review', icon: BookOpen },
];

export default function NavTabs({ activeTab, onTabChange, showNextMove = true }) {
  const visibleTabs = TABS.filter((tab) => tab.id !== 'terminal' || showNextMove);

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-elevated/80 border border-border-glass">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex-1 justify-center ${
              isActive
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-bg-surface border border-border-glass"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
