"use client";

import { motion } from "framer-motion";
import type { GymEntry, FeaturedAthlete } from "@/lib/gyms";
import { CATEGORY_LABELS, GYM_ACCENT_HEX, NETWORK_LABELS } from "@/lib/gyms";

type GymPopupProps = {
  gym: GymEntry;
  anchor: { x: number; y: number };
  onClose: () => void;
};

// ── Per-accent styling maps ───────────────────────────────────────────────────

const ACCENT_TEXT: Record<GymEntry["accent"], string> = {
  cyan:    "text-cyan-300",
  fuchsia: "text-fuchsia-300",
  amber:   "text-amber-300",
  emerald: "text-emerald-300",
  violet:  "text-violet-300",
  rose:    "text-rose-300",
};

const ACCENT_BORDER: Record<GymEntry["accent"], string> = {
  cyan:    "border-cyan-400/40",
  fuchsia: "border-fuchsia-400/40",
  amber:   "border-amber-400/40",
  emerald: "border-emerald-400/40",
  violet:  "border-violet-400/40",
  rose:    "border-rose-400/40",
};

const ACCENT_SHADOW: Record<GymEntry["accent"], string> = {
  cyan:    "shadow-[0_0_40px_-8px_rgba(34,211,238,0.4)]",
  fuchsia: "shadow-[0_0_40px_-8px_rgba(232,121,249,0.4)]",
  amber:   "shadow-[0_0_40px_-8px_rgba(250,204,21,0.4)]",
  emerald: "shadow-[0_0_40px_-8px_rgba(52,211,153,0.4)]",
  violet:  "shadow-[0_0_40px_-8px_rgba(167,139,250,0.4)]",
  rose:    "shadow-[0_0_40px_-8px_rgba(251,113,133,0.4)]",
};

const ACCENT_BTN: Record<GymEntry["accent"], string> = {
  cyan:    "border-cyan-400/55    bg-cyan-500/[0.1]    text-cyan-200    hover:border-cyan-300",
  fuchsia: "border-fuchsia-400/55 bg-fuchsia-500/[0.1] text-fuchsia-200 hover:border-fuchsia-300",
  amber:   "border-amber-400/55   bg-amber-500/[0.1]   text-amber-200   hover:border-amber-300",
  emerald: "border-emerald-400/55 bg-emerald-500/[0.1] text-emerald-200 hover:border-emerald-300",
  violet:  "border-violet-400/55  bg-violet-500/[0.1]  text-violet-200  hover:border-violet-300",
  rose:    "border-rose-400/55    bg-rose-500/[0.1]    text-rose-200    hover:border-rose-300",
};

// Category badge styles (text only, shown as a pill above the gym name)
const CATEGORY_PILL: Record<GymEntry["category"], string> = {
  kuznya:       "border-cyan-400/40    bg-cyan-500/[0.08]    text-cyan-300",
  fight_club:   "border-cyan-400/40    bg-cyan-500/[0.08]    text-cyan-300",
  wrestling:    "border-fuchsia-400/40 bg-fuchsia-500/[0.08] text-fuchsia-300",
  partner_slot: "border-violet-400/40  bg-violet-500/[0.08]  text-violet-300",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function GymPopup({ gym, anchor, onClose }: GymPopupProps) {
  const hexColor     = GYM_ACCENT_HEX[gym.accent];
  const networkLabel = NETWORK_LABELS[gym.network];
  const categoryLabel = CATEGORY_LABELS[gym.category];
  const hasCoach     = gym.coachName && gym.coachName !== "Уточняется";

  const cardWidth = 296;
  const LEFT = Math.max(8, anchor.x - cardWidth / 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      style={{ left: LEFT, top: Math.max(8, anchor.y - 20), width: cardWidth }}
      className={[
        "pointer-events-auto absolute z-[1100] overflow-hidden rounded-2xl border bg-zinc-950/97",
        ACCENT_BORDER[gym.accent],
        ACCENT_SHADOW[gym.accent],
      ].join(" ")}
    >
      <div
        className="px-4 py-4"
        style={{ background: `linear-gradient(135deg, ${hexColor}0e 0%, rgba(0,0,0,0.9) 55%)` }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 rounded-full border border-white/[0.1] bg-black/50 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-200"
        >
          esc
        </button>

        {/* Header: category pill + city */}
        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full border px-2 py-[1.5px] font-[family-name:var(--font-geist-mono)] text-[8.5px] font-semibold uppercase tracking-[0.28em]",
              CATEGORY_PILL[gym.category],
            ].join(" ")}
          >
            {categoryLabel}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.22em] text-zinc-500">
            {gym.city}
          </span>
        </div>

        {/* Gym name */}
        <h3 className="mt-1.5 font-[family-name:var(--font-geist-mono)] text-base font-semibold uppercase leading-tight tracking-[0.12em] text-white">
          {gym.name}
        </h3>

        {/* Address */}
        <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.1em] text-zinc-500">
          {gym.address}
        </p>

        {/* ── Specializations ──────────────────────────────────────────── */}
        {gym.specializations.length > 0 && (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/45 px-3 py-2.5">
            <p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Специализация
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {gym.specializations.map((s) => (
                <span
                  key={s}
                  className="rounded-full border font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.14em]"
                  style={{
                    borderColor: `${hexColor}40`,
                    background: `${hexColor}0e`,
                    color: hexColor,
                    padding: "1.5px 7px",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <hr className="my-3 border-white/[0.07]" />

        {/* Coach */}
        {hasCoach ? (
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase text-white"
              style={{
                borderColor: `${hexColor}55`,
                background: `${hexColor}18`,
                boxShadow: `0 0 18px -6px ${hexColor}`,
              }}
            >
              {initials(gym.coachName)}
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-geist-mono)] text-[11.5px] uppercase tracking-[0.1em] text-zinc-100">
                {gym.coachName}
              </p>
              <p className={["font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.18em]", ACCENT_TEXT[gym.accent]].join(" ")}>
                Главный тренер
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04]" />
            <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Тренер · уточняется
            </p>
          </div>
        )}

        {/* Contacts */}
        {(gym.phone || gym.instagram) && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {gym.phone && (
              <a
                href={`tel:${gym.phone}`}
                className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.15em] text-zinc-500 transition-colors hover:text-zinc-200"
              >
                {gym.phone}
              </a>
            )}
            {gym.instagram && (
              <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.15em] text-zinc-600">
                {gym.instagram}
              </span>
            )}
          </div>
        )}

        {/* Network label */}
        {gym.network !== "independent" && (
          <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[8.5px] uppercase tracking-[0.22em] text-zinc-700">
            Сеть: {networkLabel}
          </p>
        )}

        <hr className="my-3 border-white/[0.07]" />

        {/* Featured athletes */}
        {gym.featuredAthletes && gym.featuredAthletes.length > 0 && (
          <div className="mb-3 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5">
            <p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Бойцы клуба
            </p>
            <ul className="mt-2 space-y-2">
              {gym.featuredAthletes.map((athlete: FeaturedAthlete) => (
                <li key={athlete.profileId} className="flex items-center gap-2.5">
                  {/* Mini hex avatar */}
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase text-white"
                    style={{
                      borderColor: `${hexColor}50`,
                      background: `${hexColor}14`,
                      boxShadow: `0 0 10px -4px ${hexColor}`,
                    }}
                  >
                    {initials(athlete.displayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.1em] text-zinc-100">
                      {athlete.displayName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="rounded-full border px-1.5 py-[1px] font-[family-name:var(--font-geist-mono)] text-[7.5px] font-semibold uppercase tracking-[0.22em]"
                        style={{
                          borderColor: `${hexColor}45`,
                          background: `${hexColor}10`,
                          color: hexColor,
                        }}
                      >
                        {athlete.status}
                      </span>
                      <span className="font-[family-name:var(--font-geist-mono)] text-[8.5px] uppercase tracking-[0.1em] text-zinc-600">
                        {athlete.label}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Active splits */}
        <div className="mb-3 rounded-xl border border-white/[0.05] bg-black/40 px-3 py-2">
          <p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Активные сплиты
          </p>
          {gym.coachId ? (
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.12em] text-zinc-700">
              training_splits WHERE coach_id = {gym.coachId}
            </p>
          ) : (
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.12em] text-zinc-700">
              Тренер не подключён к Warrior Point
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          className={[
            "w-full rounded-full border py-2 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] transition-all",
            ACCENT_BTN[gym.accent],
          ].join(" ")}
          style={{ boxShadow: `0 0 24px -10px ${hexColor}` }}
          onClick={() => { window.location.href = "/?tab=splits"; }}
        >
          Записаться
        </button>
      </div>
    </motion.div>
  );
}
