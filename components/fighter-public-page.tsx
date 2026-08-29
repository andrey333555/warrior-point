"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  resolvePublicCardView,
  type FighterPublicProfile,
} from "@/lib/fighter-public";
import type { WarriorRole } from "@/lib/roles";
import { DonateModal } from "@/components/donate-modal";
import { submitFighterDonation } from "@/lib/donations-flow";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { resolveBookingHref } from "@/lib/fighter-booking";

type Props = {
  profile: FighterPublicProfile;
  viewerRole: WarriorRole | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export default function FighterPublicPage({ profile, viewerRole }: Props) {
  const router = useRouter();
  const auth = useWarriorAuth();
  const view = useMemo(
    () => resolvePublicCardView(profile, viewerRole),
    [profile, viewerRole],
  );

  const [donateOpen, setDonateOpen] = useState(false);
  const [donateBusy, setDonateBusy] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);

  const viewerId =
    auth.status === "authenticated" ? auth.user.id : undefined;

  const onDonate = useCallback(
    async (amount: number, comment: string) => {
      setDonateBusy(true);
      setDonateError(null);
      try {
        const result = await submitFighterDonation({
          recipientId: profile.id,
          grossRub: amount,
          comment,
          viewerId,
          fundraiserFallback: {
            title: profile.donationGoal ?? "Поддержка бойца",
            goalRub: 50000,
            raisedRub: Math.round(profile.donationsTotalKop / 100),
            pct: Math.min(
              100,
              Math.round((profile.donationsTotalKop / 100 / 50000) * 100),
            ),
          },
        });
        if (!result.ok) {
          setDonateError(result.message);
          return null;
        }
        return {
          grossRub: result.grossRub,
          netRub: result.netRub,
          newDonorBalance: result.newDonorBalance,
          donationId: result.donationId,
          source: result.source,
        };
      } catch (err) {
        setDonateError(
          err instanceof Error ? err.message : "Не удалось отправить донат",
        );
        return null;
      } finally {
        setDonateBusy(false);
      }
    },
    [viewerId, profile.id, profile.donationsTotalKop, profile.donationGoal],
  );

  const raisedRub = Math.round(profile.donationsTotalKop / 100);
  const fundraiser = {
    title: profile.donationGoal ?? "Поддержка бойца",
    goalRub: 50000,
    raisedRub,
    pct: Math.min(100, Math.round((raisedRub / 50000) * 100)),
  };

  return (
    <div
      className="mx-auto min-h-screen max-w-[420px] px-4 pb-28 pt-4"
      style={{ background: "#0A0A0A", color: "#fff" }}
    >
      <header className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55"
        >
          ← На главную
        </button>
        {profile.verificationStatus === "verified" ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C9A84C]">
            Верифицирован
          </span>
        ) : null}
      </header>

      <div className="mb-5 flex items-center gap-4">
        <div
          className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatarUrl || "/fighters/king-ufc-portrait.png"}
            alt={profile.displayName}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{profile.displayName}</h1>
          {profile.nickname ? (
            <p className="mt-0.5 truncate text-sm font-medium text-[#C9A84C]">
              {profile.nickname}
            </p>
          ) : null}
          <p className="text-xs text-white/40">/{profile.slug}</p>
          {view.mode === "minimal" ? (
            <p className="mt-1 text-xs text-white/50">
              Ограниченный профиль · доступны донаты
            </p>
          ) : null}
        </div>
      </div>

      {view.mode === "full" ? (
        <div className="mb-5 space-y-3">
          {view.showRecord && profile.record ? (
            <MetaRow label="Рекорд" value={profile.record} />
          ) : null}
          {view.showClub && profile.club ? (
            <MetaRow label="Клуб" value={profile.club} />
          ) : null}
          {view.showWeightClass && profile.weightClass ? (
            <MetaRow label="Вес" value={profile.weightClass} />
          ) : null}
          {view.showBio && profile.bio ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/75">
              {profile.bio}
            </p>
          ) : null}
        </div>
      ) : null}

      {view.showBooking ? (
        <Link
          href={resolveBookingHref(profile.slug)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left"
          style={{ background: "rgba(201,168,76,0.9)", color: "#0A0A0A" }}
        >
          <div>
            <p className="text-base font-extrabold">Записаться на тренировку</p>
            <p className="text-xs opacity-70">Календарь и сплиты</p>
          </div>
          <span className="text-xl">→</span>
        </Link>
      ) : (
        <p className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/40">
          Запись на тренировки временно отключена бойцом
        </p>
      )}

      {view.showDonations ? (
        <button
          type="button"
          onClick={() => setDonateOpen(true)}
          className="mb-4 w-full rounded-2xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-4 text-left"
        >
          <p className="text-base font-bold text-[#C9A84C]">Поддержать бойца</p>
          {profile.donationGoal ? (
            <p className="mt-1 text-sm font-medium text-white/85">
              {profile.donationGoal}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs text-white/45">
            Донат доступен всегда · собрано {raisedRub.toLocaleString("ru-RU")} ₽
          </p>
        </button>
      ) : null}

      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        fighterName={profile.displayName}
        fighterInitials={initials(profile.displayName)}
        fundraiser={fundraiser}
        onDonate={onDonate}
        busy={donateBusy}
        error={donateError}
      />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">
        {label}
      </span>
      <span className="text-right text-sm text-white/85">{value}</span>
    </div>
  );
}
