import { motion } from 'framer-motion';

export default function Workspace({ leftColumn, rightColumn }) {
  return (
    <div className="min-h-screen bg-bg-deep">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-glass">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-green flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#161512" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 16l-1.447.724A1 1 0 0 0 6 17.618V21h12v-3.382a1 1 0 0 0-.553-.894L16 16" />
                <path d="M8.5 16h7a1 1 0 0 0 .916-.6l1.553-3.527A2 2 0 0 0 18 11.5V10a2 2 0 0 0-2-2h-1V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3H8a2 2 0 0 0-2 2v1.5a2 2 0 0 0 .031.345l1.553 3.527A1 1 0 0 0 8.5 16Z" />
              </svg>
            </div>
            <h1 className="font-heading text-xl font-bold text-text-primary tracking-wide">
              CHESS WORKSPACE
            </h1>
            <span className="text-xs text-text-dim font-mono ml-2 hidden sm:inline">AI COACH v1.0</span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Grid */}
      <main className="max-w-[1600px] mx-auto p-4 lg:p-6">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-[minmax(380px,520px)_1fr] gap-5 lg:gap-6 items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Left Column — Board */}
          <div className="flex flex-col gap-4">
            {leftColumn}
          </div>

          {/* Right Column — Feature Windows */}
          <div className="flex flex-col gap-4 min-w-0">
            {rightColumn}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
