import type { Metadata } from "next";
import FighterPublicGate from "@/components/fighter-public-gate";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  fetchFighterBySlug,
  getDemoFighterBySlug,
  redactFighterForAnonymous,
} from "@/lib/fighter-public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * `null` = client not configured at all (legitimate demo mode).
 * `{ profile: null }` = no fighter with this slug (real 404).
 * throws = the read itself failed (permission/network/etc) — the caller
 * must show a distinct error, never silently fall back to someone else's
 * demo card.
 */
async function loadProfile(slug: string) {
  const client = createWarriorBrowserClient();
  if (!client) return { profile: getDemoFighterBySlug(slug) };
  const profile = await fetchFighterBySlug(client, slug);
  return { profile };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let profile: Awaited<ReturnType<typeof loadProfile>>["profile"] = null;
  try {
    profile = (await loadProfile(slug)).profile;
  } catch {
    // Metadata falls back to a generic title — the page body surfaces the
    // real error.
  }
  const safe = profile ? redactFighterForAnonymous(profile) : null;
  return {
    title: safe
      ? `${safe.displayName} · Warrior Point`
      : "Боец · Warrior Point",
    description:
      safe?.visibility === "public" && safe.bio
        ? safe.bio
        : "Публичная карточка бойца Round 23",
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
  const publicSafe = redactFighterForAnonymous(profile);
  return <FighterPublicGate profile={publicSafe} slug={slug} />;
}
