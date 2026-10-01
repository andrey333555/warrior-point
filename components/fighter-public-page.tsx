"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  resolvePublicCardView,
  type FighterPublicProfile,
} from "@/lib/fighter-public";
import type { WarriorRole } from "@/lib/roles";
import { DonateModal } from "@/components/donate-modal";
import FundraisingProgress, {
  type FundraisingRecentDonation,
} from "@/components/FundraisingProgress";
import { resolveBookingHref } from "@/lib/fighter-booking";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  fetchDonationFeed,
  fetchFundraiserProgress,
  type FundraiserProgress,
} from "@/lib/supabase/donations";
import { localFundraiserProgress } from "@/lib/donations-store";
import {
  daysLeftFromDeadline,
  formatDonationTimeAgo,
  tipOnlyFundraiserProgress,
} from "@/lib/fundraising-campaign";
import { fighterHasBookableSplits } from "@/lib/supabase/splits-sync";

type Props = {
  profile: FighterPublicProfile;
  viewerRole: WarriorRole | null;
  viewerRoles?: WarriorRole[] | null;
  commissionUiEnabled?: boolean;
};

export default function FighterPublicPage({
  profile,
  viewerRole,
  viewerRoles = null,
  commissionUiEnabled = false,
}: Props) {
  const router = useRouter();
  const view = useMemo(
    () => resolvePublicCardView(profile, viewerRole, viewerRoles),
    [profile, viewerRole, viewerRoles],
  );

  const [donateOpen, setDonateOpen] = useState(false);
  const [donatePreset, setDonatePreset] = useState<number | undefined>();
  const [hasCampaign, setHasCampaign] = useState(false);
  const [hasTrainings, setHasTrainings] = useState(false);
  const [fundraiser, setFundraiser] = useState<FundraiserProgress>(() =>
    tipOnlyFundraiserProgress(),
  );
  const [recentDonations, setRecentDonations] = useState<
    FundraisingRecentDonation[]
  >([]);

  useEffect(() => {
    const client = createWarriorBrowserClient();
    if (!client) {
      setHasCampaign(false);
      setHasTrainings(false);
      setFundraiser(tipOnlyFundraiserProgress());
      setRecentDonations([]);
      return;
    }

    void fetchFundraiserProgress(client, profile.id).then((remote) => {
      const merged = localFundraiserProgress(profile.id, remote);
      if (merged) {
        setHasCampaign(true);
        setFundraiser(merged);
      } else {
        setHasCampaign(false);
        setFundraiser(tipOnlyFundraiserProgress());
      }
    });

    void fetchDonationFeed(client, profile.id, 3).then((rows) => {
      setRecentDonations(
        rows.map((row) => {
          const name = row.donorName?.trim() || "";
          const isAnonymous = !name || name === "Гость" || name === "Аноним";
          return {
            name: isAnonymous ? "Аноним" : name,
            amount: row.netAmount > 0 ? row.netAmount : row.grossAmount,
            isAnonymous,
            timeAgo: formatDonationTimeAgo(row.createdAt),
          };
        }),
      );
    });

    void fighterHasBookableSplits(client, profile.id).then(setHasTrainings);
  }, [profile.id]);

  const openDonate = useCallback((amount: number) => {
    setDonatePreset(amount > 0 ? amount : undefined);
    setDonateOpen(true);
  }, []);

  // Coach booking only when role includes coach AND real trainings exist.
  const showBooking = view.showBooking && hasTrainings;

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
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-full w-full object-cover"
            />
          ) : null}
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

      {/* One donate/tips control for fighter, athlete, and coach */}
      {view.showDonations ? (
        <div className="mb-4">
          <FundraisingProgress
            title={fundraiser.title}
            description={fundraiser.description}
            goal={fundraiser.goalRub}
            raised={fundraiser.raisedRub}
            hasCampaign={hasCampaign}
            daysLeft={daysLeftFromDeadline(fundraiser.deadline)}
            recentDonations={recentDonations}
            donationsEnabled={commissionUiEnabled}
            onSupport={openDonate}
          />
        </div>
      ) : null}

      {showBooking ? (
        <Link
          href={resolveBookingHref(profile.slug)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left"
        >
          <div>
            <p className="text-base font-semibold text-white/90">
              Записаться на тренировку
            </p>
            <p className="text-xs text-white/40">Календарь и сплиты</p>
          </div>
          <span className="text-xl text-white/40">→</span>
        </Link>
      ) : null}

      {view.showFighterCard && view.mode === "full" ? (
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

      {commissionUiEnabled ? (
        <DonateModal
          open={donateOpen}
          onClose={() => {
            setDonateOpen(false);
            setDonatePreset(undefined);
          }}
          fighterName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          sbpPhone={profile.sbpPhone}
          sbpBank={profile.sbpBank}
          fundraiser={fundraiser}
          commissionUiEnabled={commissionUiEnabled}
          initialAmount={donatePreset}
        />
      ) : null}
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
