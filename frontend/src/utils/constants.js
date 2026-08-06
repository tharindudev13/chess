// ── API ──
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

// ── Move Quality → Color Map ──
// Maps every quality label the backend can return to a specific hex color
export const QUALITY_COLORS = {
  'Brilliant':       '#06b6d4',
  'Great Move':      '#3b82f6',
  'Best Move':       '#22c55e',
  'Excellent':       '#10b981',
  'Good Move':       '#84cc16',
  'Forced':          '#64748b',
  'Book':            '#d5a47e',
  'Book/Standard':   '#d5a47e',
  'Inaccuracy':      '#eab308',
  'Mistake':         '#f97316',
  'Miss':            '#f43f5e',
  'Blunder':         '#ef4444',
};

// ── Quality → CSS class suffix ──
export const QUALITY_CLASS = {
  'Brilliant':       'brilliant',
  'Great Move':      'great',
  'Best Move':       'best',
  'Excellent':       'excellent',
  'Good Move':       'good',
  'Forced':          'forced',
  'Book':            'book',
  'Book/Standard':   'book',
  'Inaccuracy':      'inaccuracy',
  'Mistake':         'mistake',
  'Miss':            'miss',
  'Blunder':         'blunder',
};

// ── Time Control Presets ──
export const TIME_CONTROLS = [
  { label: '1 min',   value: 60,    tag: 'Bullet' },
  { label: '3 min',   value: 180,   tag: 'Blitz' },
  { label: '5 min',   value: 300,   tag: 'Blitz' },
  { label: '10 min',  value: 600,   tag: 'Rapid' },
  { label: '15 min',  value: 900,   tag: 'Rapid' },
  { label: '∞',       value: null,  tag: 'Unlimited' },
];

// ── Board Colors ──
export const BOARD_COLORS = {
  lightSquare: '#b8b579',
  darkSquare:  '#6b8a3e',
};

// ── Starting FEN ──
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
