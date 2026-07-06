"use client";

import { cn } from "@/lib/cn";

type ErrorMessageProps = {
  message: string;
  className?: string;
  onRetry?: () => void;
};

export function ErrorMessage({ message, className, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200/90",
        className,
      )}
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-red-300 underline-offset-2 hover:underline"
        >
          Попробовать снова
        </button>
      ) : null}
    </div>
  );
}
