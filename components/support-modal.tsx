"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TIP_PRESETS } from "@/lib/tip-presets";

type Screen = "pick" | "paying" | "done";

type SupportModalProps = {
  trainerId?: number;
  trainerName: string;
  onClose: () => void;
  onSuccess: (amount: number) => void;
};

export function SupportModal({
  trainerName,
  onClose,
  onSuccess,
}: SupportModalProps) {
  const [selected, setSelected] = useState(300);
  const [screen, setScreen] = useState<Screen>("pick");

  const handlePay = () => {
    if (screen === "paying") return;
    setScreen("paying");
    setTimeout(() => {
      setScreen("done");
      onSuccess(selected);
      setTimeout(onClose, 1800);
    }, 1300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md"
      onClick={screen === "pick" ? onClose : undefined}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border-t border-white/[0.08] bg-zinc-950/95 px-5 pb-10 pt-4"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />

        <AnimatePresence mode="wait">
          {screen === "paying" ? (
            <motion.div
              key="paying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                className="h-8 w-8 rounded-full border-2 border-rose-400/30 border-t-rose-400"
              />
              <p className="text-sm text-gray-400">Отправляем поддержку…</p>
            </motion.div>
          ) : screen === "done" ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <span className="text-5xl">❤️</span>
              <p className="text-lg font-bold text-white">Спасибо, ты поддержал тренера</p>
              <p className="text-sm text-gray-400">{trainerName}</p>
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-1.5 text-sm text-rose-300">
                +{selected}₽
              </span>
            </motion.div>
          ) : (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-xl font-bold text-white">Поддержать тренера</h2>
              <p className="mt-1 text-sm text-gray-500">{trainerName}</p>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {TIP_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelected(amt)}
                    className={`rounded-2xl border py-4 text-lg font-semibold transition-all ${
                      selected === amt
                        ? "border-rose-400/40 bg-rose-400/8 text-white"
                        : "border-zinc-800 bg-zinc-900 text-gray-300"
                    }`}
                  >
                    {amt}₽
                  </button>
                ))}
              </div>

              <Button
                fullWidth
                size="lg"
                variant="rose"
                loading={screen === "paying"}
                disabled={screen === "paying"}
                onClick={handlePay}
                className="mt-5"
              >
                Отправить · {selected}₽
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
