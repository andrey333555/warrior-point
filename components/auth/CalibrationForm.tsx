"use client";

import { motion } from "framer-motion";
import { useAuthForm } from "@/components/auth/context";
import {
  SKILL_TIERS,
  parseRecordInput,
  formatRecord,
  type SkillTier,
} from "@/lib/calibration";

const INPUT_CLASS =
  "w-full rounded-[10px] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#C9A84C]/40";

const INPUT_STYLE = {
  background: "rgba(255,255,255,0.05)",
  border: "0.5px solid rgba(255,255,255,0.1)",
};

export function CalibrationForm() {
  const {
    mode,
    skillTier,
    setSkillTier,
    recordInput,
    setRecordInput,
    calibrationPreview,
  } = useAuthForm();

  if (mode !== "register") return null;

  const parsed = parseRecordInput(recordInput);
  const recordValid = recordInput.trim() === "" || parsed !== null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 space-y-3 overflow-hidden"
    >
      <div>
        <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em] text-[#C9A84C]/80">
          Стартовая калибровка
        </p>
        <p className="text-xs text-white/45">
          Уровень и рекорд определяют стартовый ELO и цены на тренировки
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SKILL_TIERS.map((tier) => {
          const active = skillTier === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSkillTier(tier.id as SkillTier)}
              className={
                active
                  ? "rounded-xl border border-[#C9A84C]/50 bg-[#C9A84C]/10 px-2 py-2.5 text-center transition"
                  : "rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2.5 text-center transition hover:border-white/20"
              }
            >
              <span className="text-lg">{tier.emoji}</span>
              <p className="mt-1 text-[11px] font-semibold text-white">{tier.label}</p>
            </button>
          );
        })}
      </div>

      <input
        type="text"
        placeholder="Рекорд · 5-2 или 12-3-1"
        value={recordInput}
        onChange={(e) => setRecordInput(e.target.value)}
        className={INPUT_CLASS}
        style={{
          ...INPUT_STYLE,
          borderColor: recordValid ? INPUT_STYLE.border : "rgba(248,113,113,0.5)",
        }}
      />

      {calibrationPreview ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-3 py-2.5 text-xs text-emerald-200/90">
          <p>
            ✅ Подтверждённый боец · ELO {calibrationPreview.startingElo} · рекорд{" "}
            {formatRecord(calibrationPreview.record)}
          </p>
          <p className="mt-1 text-white/45">
            {calibrationPreview.priceHint}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
