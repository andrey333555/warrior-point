export function Divider({
  label,
  plain = false,
}: {
  label: string;
  plain?: boolean;
}) {
  if (plain) {
    return (
      <p className="my-3 text-center text-xs tracking-wide text-white/30">
        {label}
      </p>
    );
  }

  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs tracking-widest text-white/30">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
