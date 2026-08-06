import { motion } from 'framer-motion';

export default function Workspace({ leftColumn, rightColumn }) {
  return (
    <div className="min-h-screen bg-bg-deep">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-glass">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/gemini-svg.svg" alt="CheckMate.ai Logo" className="w-8 h-8 rounded-lg object-contain shadow-md" />
            <h1 className="font-heading text-xl font-bold text-text-primary tracking-wide">
              CheckMate.ai
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
