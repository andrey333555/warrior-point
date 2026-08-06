import type { Metadata } from "next";
import FighterPublicGate from "@/components/fighter-public-gate";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  fetchFighterBySlug,
  getDemoFighterBySlug,
  redactFighterForAnonymous,
} from "@/lib/fighter-public";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";

type Props = { params: Promise<{ slug: string }> };

async function loadProfile(slug: string) {
  const service = createWarriorServiceClient();
  const client = service ?? createWarriorBrowserClient();
  if (!client) return getDemoFighterBySlug(slug);
  return fetchFighterBySlug(client, slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = (await loadProfile(slug)) ?? getDemoFighterBySlug(slug);
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
  const profile = await loadProfile(slug);

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
