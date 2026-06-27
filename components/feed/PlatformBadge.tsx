type PlatformBadgeProps = {
  label: string;
};

export function PlatformBadge({ label }: PlatformBadgeProps) {
  return (
    <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">{label}</span>
  );
}
