"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GymEntry } from "@/lib/gyms";
import { GYM_ACCENT_HEX } from "@/lib/gyms";
import { gymHeroProps } from "@/lib/gym-display";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { fetchGymSplits, type GymSplit } from "@/lib/supabase/splits-sync";
import { bookSplitSeat } from "@/lib/split-booking-api";
import GymHero from "@/components/GymHero";
import GymTrainers from "@/components/GymTrainers";
import { GymFighters } from "@/components/GymFighters";
import { GymSchedule } from "@/components/GymSchedule";
import { GymMap } from "@/components/GymMap";

type GymDetailBodyProps = {
  gym: GymEntry;
  clientId?: string;
  onClose?: () => void;
  onBooked?: (msg: string) => void;
};

export function GymDetailBody({
  gym,
  clientId,
  onClose,
  onBooked,
}: GymDetailBodyProps) {
  const hexColor = GYM_ACCENT_HEX[gym.accent];
  const hero = gymHeroProps(gym);

  const scrollToSchedule = useCallback(() => {
    document.getElementById("gym-schedule")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const client = useMemo(() => createWarriorBrowserClient(), []);
  const [splits, setSplits] = useState<GymSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [echo, setEcho] = useState<{ tone: "ok" | "err"; msg: string } | null>(
    null,
  );

  const displayCoach =
    gym.featuredAthletes?.[0]?.displayName ?? gym.coachName ?? "Тренер";

  const loadSplits = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchGymSplits(client, {
        gymId: gym.id,
        coachId: gym.coachId || undefined,
        currentFighterId: clientId,
      });
      setSplits(data);
    } catch {
      setSplits([]);
    } finally {
      setLoading(false);
    }
  }, [client, gym.id, gym.coachId, clientId]);

  useEffect(() => {
    void loadSplits();
  }, [loadSplits]);

  const handleBook = async (splitId: string) => {
    if (!clientId) {
      setEcho({ tone: "err", msg: "Войди в аккаунт для записи" });
      return;
    }

    setBusyId(splitId);
    setEcho(null);

    const result = await bookSplitSeat({ clientId, splitId });

    setBusyId(null);

    if (!result.ok) {
      setEcho({ tone: "err", msg: result.message });
      return;
    }

    const msg = result.activated
      ? "Записан · сплит АКТИВЕН · +1 streak · +1 билет"
      : "Записан на сплит · +1 streak · +1 билет";

    setEcho({ tone: "ok", msg });
    onBooked?.(msg);
    void loadSplits();
    setTimeout(() => setEcho(null), 4000);
  };

  return (
    <>
      <GymHero
        name={hero.name}
        city={hero.city}
        rating={hero.rating}
        members={hero.members}
        image={hero.image}
        gymId={hero.gymId}
        onClose={onClose}
        onTrain={scrollToSchedule}
      />

      <GymTrainers gymName={hero.name} />

      {gym.featuredAthletes && gym.featuredAthletes.length > 0 ? (
        <GymFighters athletes={gym.featuredAthletes} hexColor={hexColor} />
      ) : null}

      <GymSchedule
        splits={splits}
        loading={loading}
        hexColor={hexColor}
        displayCoach={displayCoach}
        busyId={busyId}
        clientId={clientId}
        onBook={(id) => void handleBook(id)}
      />

      <GymMap gym={gym} hexColor={hexColor} />

      <AnimatePresence>
        {echo ? (
          <motion.p
            key={echo.msg}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={[
              "mt-3 rounded-xl px-3 py-2 text-center font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.16em]",
              echo.tone === "ok"
                ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                : "border border-rose-400/35 bg-rose-500/10 text-rose-200",
            ].join(" ")}
          >
            {echo.msg}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </>
  );
}
