import { cn } from "@/lib/cn";

const GOLD = "#C9A84C";

type WarriorLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = { sm: 28, md: 40, lg: 56 } as const;

export function WarriorLogo({ size = "md", className }: WarriorLogoProps) {
  const px = SIZES[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
      className={className}
    >
      <polygon
        points="28,4 52,16 52,40 28,52 4,40 4,16"
        stroke={GOLD}
        strokeWidth="2"
        fill="none"
      />
      <polygon
        points="28,14 42,22 42,34 28,42 14,34 14,22"
        stroke={GOLD}
        strokeWidth="1.5"
        fill="rgba(201,168,76,0.08)"
        opacity="0.9"
      />
      <circle cx="28" cy="28" r="3" fill={GOLD} />
    </svg>
  );
}

type AppBrandProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

export function AppBrand({ size = "md", showTagline = false, className }: AppBrandProps) {
  const titleClass =
    size === "lg"
      ? "text-3xl font-bold tracking-tight"
      : size === "md"
        ? "text-xl font-bold tracking-tight"
        : "text-base font-semibold tracking-wide";

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <WarriorLogo size={size} />
      <p
        className={cn(
          "mt-3 font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-[0.28em] text-yellow-400",
          titleClass,
        )}
      >
        Warrior Point
      </p>
      {showTagline ? (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
          Международная платформа единоборств
        </p>
      ) : null}
    </div>
  );
}
