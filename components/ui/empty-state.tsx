"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon = "🥊",
  title,
  description,
  actionLabel = "Найти тренера",
  actionHref = "/ai-match",
  onAction,
  className,
}: EmptyStateProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) {
      onAction();
      return;
    }
    router.push(actionHref);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-8 text-center",
        className,
      )}
    >
      <span className="text-3xl">{icon}</span>
      <p className="mt-3 font-semibold text-white">{title}</p>
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>
      ) : null}
      {actionLabel ? (
        <div className="mt-5">
          <Button size="md" onClick={handleAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}
