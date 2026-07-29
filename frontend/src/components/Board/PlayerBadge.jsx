export default function PlayerBadge({ color, name, isActive }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
      isActive ? 'bg-bg-surface/60 border border-border-glass' : 'opacity-60'
    }`}>
      <div className={`w-4 h-4 rounded-sm ${
        color === 'w' ? 'bg-white' : 'bg-[#1a1a1a] border border-white/20'
      }`} />
      <span className="text-sm font-semibold text-text-primary font-heading tracking-wide">
        {name}
      </span>
      {isActive && (
        <span className="ml-auto text-[10px] font-mono text-accent-green animate-pulse">
          LIVE
        </span>
      )}
    </div>
  );
}
