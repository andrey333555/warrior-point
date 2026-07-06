"use client";

import { cn } from "@/lib/cn";

const VARIANTS = {
  primary:
    "bg-yellow-400 text-black hover:bg-yellow-300 active:bg-yellow-500 disabled:bg-yellow-400/40 disabled:text-black/50",
  secondary:
    "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-40",
  outline:
    "bg-transparent text-white border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 active:bg-zinc-800 disabled:opacity-40",
  ghost:
    "bg-transparent text-gray-400 hover:text-white hover:bg-zinc-900 active:bg-zinc-800 disabled:opacity-40",
  rose:
    "bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600 disabled:bg-rose-500/40",
  accent:
    "border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/15 active:bg-yellow-400/20 disabled:opacity-40",
} as const;

const SIZES = {
  sm: "h-10 px-4 text-sm rounded-xl",
  md: "h-12 px-5 text-sm rounded-xl",
  lg: "h-14 px-6 text-base rounded-xl",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all",
        "active:scale-[0.98] disabled:pointer-events-none disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span
            className={cn(
              "h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current",
              size === "lg" && "h-5 w-5",
            )}
            aria-hidden
          />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
