import MoveBadge from './MoveBadge';

export default function MoveTimeline({ reviews, selectedIndex, onSelectMove }) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <div>
      <label className="text-xs font-heading text-text-muted tracking-wider uppercase mb-2 block">
        Move Timeline
      </label>
      <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-bg-surface/30 border border-border-glass max-h-[220px] overflow-y-auto">
        {reviews.map((move, index) => (
          <MoveBadge
            key={index}
            move={move}
            index={index}
            isSelected={selectedIndex === index}
            onClick={() => onSelectMove(index)}
          />
        ))}
      </div>
    </div>
  );
}
