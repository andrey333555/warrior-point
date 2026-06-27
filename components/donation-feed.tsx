"use client";

import { motion } from "framer-motion";
import type { DonationRow } from "@/lib/supabase/donations";

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DonationFeed({ donations }: { donations: DonationRow[] }) {
  if (donations.length === 0) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-black/40 px-4 py-5 text-center font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        Лента донатов пуста · стань первым поддержать
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {donations.map((d, i) => (
        <motion.li
          key={d.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl border border-white/[0.08] bg-gradient-to-r from-fuchsia-500/[0.06] via-black/50 to-cyan-500/[0.04] px-3.5 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-geist-sans)] text-[13px] font-semibold text-white">
                {d.donorName ?? "Анонимный донор"}
              </p>
              <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                {formatWhen(d.createdAt)} · донат
              </p>
            </div>
            <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[15px] font-bold tabular-nums text-emerald-300">
              +{fmtRub.format(d.grossAmount)}
            </span>
          </div>
          {d.comment ? (
            <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-[12px] leading-relaxed text-zinc-300">
              «{d.comment}»
            </p>
          ) : null}
        </motion.li>
      ))}
    </ul>
  );
}
