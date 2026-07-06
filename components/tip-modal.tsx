"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { markTipped } from "@/lib/bookings";
import { Button } from "@/components/ui/button";

const PRESET_AMOUNTS = [100, 300, 500];

type Screen = "pick" | "paying" | "done";

export function TipModal({
  bookingId,
  trainerName,
  onClose,
}: {
  bookingId: string;
  trainerName: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number>(300);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [screen, setScreen] = useState<Screen>("pick");

  const amount = useCustom ? (Number.parseInt(custom, 10) || 0) : selected;
  const canPay = amount > 0;

  const handlePay = () => {
    if (!canPay) return;
    setScreen("paying");
    setTimeout(() => {
      markTipped(bookingId);
      setScreen("done");
      setTimeout(onClose, 1600);
    }, 1400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={screen === "pick" ? onClose : undefined}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 px-5 pb-10 pt-4"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />

        <AnimatePresence mode="wait">
          {/* ── Paying ── */}
          {screen === "paying" ? (
            <motion.div
              key="paying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                className="h-8 w-8 rounded-full border-2 border-yellow-400/30 border-t-yellow-400"
              />
              <p className="text-sm text-gray-400">Отправляем чаевые…</p>
            </motion.div>

          /* ── Done ── */
          ) : screen === "done" ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10 text-4xl"
              >
                💛
              </motion.div>
              <p className="text-lg font-bold text-white">Тренер получил чаевые</p>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-yellow-400">
                +{amount}₽
              </p>
              <p className="text-xs text-gray-500">Спасибо от {trainerName}</p>
            </motion.div>

          /* ── Pick amount ── */
          ) : (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                Чаевые
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Понравилась тренировка?</h2>
              <p className="mt-1 text-sm text-gray-500">
                {trainerName} будет рад вашей благодарности
              </p>

              {/* Preset amounts */}
              <div className="mt-6 grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setSelected(amt); setUseCustom(false); }}
                    className={`rounded-2xl border py-4 text-center font-semibold transition-all ${
                      !useCustom && selected === amt
                        ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-400 shadow-[0_0_20px_-6px_rgba(250,204,21,0.4)]"
                        : "border-zinc-800 bg-zinc-900 text-white"
                    }`}
                  >
                    <span className="block text-lg">{amt}₽</span>
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`mt-2 w-full rounded-2xl border py-3.5 text-sm transition-all ${
                  useCustom
                    ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-400"
                    : "border-zinc-800 bg-zinc-900 text-gray-400"
                }`}
              >
                {useCustom ? (
                  <input
                    autoFocus
                    type="number"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Введите сумму ₽"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-center text-yellow-400 outline-none placeholder-yellow-400/40"
                  />
                ) : (
                  "Своя сумма"
                )}
              </button>

              {/* CTA */}
              <Button
                fullWidth
                size="lg"
                loading={screen === "paying"}
                disabled={!canPay || screen === "paying"}
                onClick={handlePay}
                className="mt-5"
              >
                Оставить чаевые · {canPay ? `${amount}₽` : "…"}
              </Button>

              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={onClose}
                className="mt-3"
              >
                Пропустить
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
