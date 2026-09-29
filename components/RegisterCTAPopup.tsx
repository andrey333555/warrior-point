"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, Users } from "lucide-react";

export default function RegisterCTAPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("registerCTADismissed");
      if (dismissed) {
        setIsDismissed(true);
        return;
      }
    } catch {
      /* private mode */
    }
    const timer = setTimeout(() => setIsVisible(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem("registerCTADismissed", "true");
    } catch {
      /* private mode */
    }
  };

  const handleRegister = () => {
    window.location.href = "/register/fighter";
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-gray-900 to-black p-8 shadow-2xl shadow-yellow-400/20">
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
                aria-label="Закрыть"
              >
                <X size={24} />
              </button>
              <div className="mb-4 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-400/50">
                  <Trophy size={40} className="text-black" />
                </div>
              </div>
              <h2 className="mb-2 text-center text-3xl font-bold text-white">
                Стань бойцом Round 23
              </h2>
              <p className="mb-6 text-center text-gray-400">
                Создай паспорт за 30 секунд <br />
                и получи{" "}
                <span className="font-bold text-yellow-400">+100 XP</span> в
                подарок
              </p>
              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <Zap size={20} className="text-yellow-400" />
                  <span>ELO рейтинг и раунды</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Users size={20} className="text-yellow-400" />
                  <span>Матчи с бойцами твоего уровня</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Trophy size={20} className="text-yellow-400" />
                  <span>Прокачивайся каждый день</span>
                </div>
              </div>
              <p className="mb-4 text-center text-xs text-gray-500">
                🥊 5 231 боец уже в системе
              </p>
              <button
                type="button"
                onClick={handleRegister}
                className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 py-4 font-bold text-black shadow-lg transition-all hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-400/50 active:scale-[0.98]"
              >
                Создать паспорт →
              </button>
              <p className="mt-4 text-center text-xs text-gray-500">
                Уже с нами?{" "}
                <button
                  type="button"
                  onClick={handleRegister}
                  className="text-yellow-400 hover:underline"
                >
                  Войти
                </button>
              </p>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
