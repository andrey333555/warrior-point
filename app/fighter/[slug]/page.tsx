import type { Metadata } from "next";
import FighterPublicGate from "@/components/fighter-public-gate";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  fetchFighterBySlug,
  redactFighterForAnonymous,
  type FighterPublicProfile,
} from "@/lib/fighter-public";
import {
  fetchActiveCampaign,
  type FundraisingCampaign,
} from "@/lib/fundraising-campaign";
import { isDonationCommissionEnabled } from "@/lib/payments-provider";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function isDemoFixture(profile: FighterPublicProfile): boolean {
  if (profile.id === DEMO_FIGHTER_DB_ID) return true;
  if (profile.slug.trim().toLowerCase() === "king") return true;
  return /демо-боец/i.test(profile.bio ?? "");
}

/**
 * Public fighter cards come only from Supabase.
 * No client / no row / demo King fixture → 404.
 * throws = the read itself failed — distinct error, not another fighter's card.
 */
async function loadProfile(slug: string) {
  const client = createWarriorBrowserClient();
  if (!client) return { profile: null };
  const profile = await fetchFighterBySlug(client, slug);
  if (profile && isDemoFixture(profile)) return { profile: null };
  return { profile };
}

/**
 * romanov's real SBP phone/bank aren't in the DB yet — `profiles.sbp_phone`/
 * `sbp_bank` need migration 0033, which isn't part of this branch (see
 * launch-sbp-donate scope). Rather than hardcode a real phone number into
 * git history, read it from server-only env vars for this one fighter.
 * Never NEXT_PUBLIC_ — these never reach the client bundle, only the
 * resolved string value baked into this specific SSR response (same as the
 * phone number would be once it's a real DB column — it's meant to be
 * shown to donors, not a secret, just not something to commit as a literal).
 * Falls back to whatever the DB already has, so this stops being needed
 * automatically once 0033 ships and the column is populated.
 */
function withSbpOverrides(
  profile: FighterPublicProfile,
): FighterPublicProfile {
  if (profile.slug.trim().toLowerCase() !== "romanov") return profile;
  return {
    ...profile,
    sbpPhone:
      profile.sbpPhone ?? process.env.SBP_DONATE_ROMANOV_PHONE?.trim() ?? null,
    sbpBank:
      profile.sbpBank ?? process.env.SBP_DONATE_ROMANOV_BANK?.trim() ?? null,
  };
}

function fighterPageTitle(safe: FighterPublicProfile | null): string {
  if (!safe) return "Боец · Warrior Point";
  const name = safe.displayName.trim() || "Боец";
  const nick = safe.nickname?.trim();
  return nick
    ? `${name} «${nick}» · Warrior Point`
    : `${name} · Warrior Point`;
}

function fighterPageDescription(
  safe: FighterPublicProfile | null,
  campaign: FundraisingCampaign | null,
): string {
  if (!safe) {
    return "Публичная карточка бойца на Warrior Point.";
  }
  const name = safe.displayName.trim() || "Боец";
  const active = campaign && campaign.isActive ? campaign : null;
  if (active) {
    const title = active.title.trim();
    const goal = active.goalAmount > 0 ? Math.round(active.goalAmount) : 0;
    if (title && goal > 0) {
      return `${title}. Цель сбора — ${goal.toLocaleString("ru-RU")} ₽. Поддержите ${name} на Warrior Point.`;
    }
    if (title) {
      return `${title}. Поддержите ${name} на Warrior Point.`;
    }
    if (goal > 0) {
      return `Сбор средств: цель ${goal.toLocaleString("ru-RU")} ₽. Поддержите ${name} на Warrior Point.`;
    }
  }
  if (safe.visibility === "public" && safe.bio?.trim()) {
    return safe.bio.trim();
  }
  return `Публичная карточка бойца ${name} на Warrior Point.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let profile: Awaited<ReturnType<typeof loadProfile>>["profile"] = null;
  let campaign: FundraisingCampaign | null = null;
  try {
    profile = (await loadProfile(slug)).profile;
    if (profile) {
      const client = createWarriorBrowserClient();
      if (client) {
        campaign = await fetchActiveCampaign(client, profile.id);
      }
    }
  } catch {
    // Metadata falls back to a generic title — the page body surfaces the
    // real error.
  }
  const safe = profile ? redactFighterForAnonymous(profile) : null;
  return {
    title: fighterPageTitle(safe),
    description: fighterPageDescription(safe, campaign),
  };
}

export default async function FighterSlugPage({ params }: Props) {
  const { slug } = await params;

  let profile: Awaited<ReturnType<typeof loadProfile>>["profile"];
  try {
    profile = (await loadProfile(slug)).profile;
  } catch (err) {
    console.error(`[fighter/${slug}] read failed:`, err);
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ background: "#0A0A0A", color: "#fff" }}
      >
        <p className="text-lg font-semibold">Не удалось загрузить карточку</p>
        <p className="text-sm text-white/45">
          Попробуйте обновить страницу через минуту
        </p>
        <a href="/" className="mt-2 text-sm text-[#C9A84C]">
          На главную
        </a>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ background: "#0A0A0A", color: "#fff" }}
      >
        <p className="text-lg font-semibold">Боец не найден</p>
        <p className="text-sm text-white/45">
          Проверьте ссылку или откройте паспорт в приложении
        </p>
        <a href="/" className="mt-2 text-sm text-[#C9A84C]">
          На главную
        </a>
      </div>
    );
  }

  // SSR never ships private/limited PII in the HTML payload.
  const publicSafe = withSbpOverrides(redactFighterForAnonymous(profile));
  return (
    <FighterPublicGate
      profile={publicSafe}
      slug={slug}
      commissionUiEnabled={isDonationCommissionEnabled()}
    />
  );
}
