type DurationBadgeProps = {
  duration: string;
};

export function DurationBadge({ duration }: DurationBadgeProps) {
  return (
    <span className="absolute bottom-2 right-2 z-10 rounded bg-black/70 px-2 py-1 text-xs text-white">
      {duration}
    </span>
  );
}
