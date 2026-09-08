import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { hashedClientKey, jsonError } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeInviteCode } from "@/lib/fighter-import";
import { memoryGetByCode, memoryUpsert } from "@/lib/fighter-import-store";

type Ctx = { params: Promise<{ code: string }> };

async function findDraft(code: string) {
  const fromMemory = memoryGetByCode(code);
  if (fromMemory) return fromMemory;

  const sb = createWarriorServiceClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("fighter_invite_drafts")
    .select("invite_code, profile_id, slug, name, city, club, style, weight, height, record, status")
    .eq("invite_code", code)
    .maybeSingle();
  if (error || !data) return null;

  const draft = {
    inviteCode: data.invite_code as string,
    profileId: data.profile_id as string,
    slug: data.slug as string,
    name: data.name as string,
    city: (data.city as string) ?? "",
    club: (data.club as string) ?? "",
    style: (data.style as string) ?? "mma",
    weight: data.weight == null ? undefined : Number(data.weight),
    height: data.height == null ? undefined : Number(data.height),
    record: (data.record as string) ?? undefined,
    status:
      data.status === "activated" || data.status === "invited"
        ? data.status
        : ("draft" as const),
  };
  memoryUpsert([draft]);
  return draft;
}

function publicPayload(draft: NonNullable<Awaited<ReturnType<typeof findDraft>>>) {
  return {
    ok: true as const,
    name: draft.name,
    city: draft.city,
    club: draft.club,
    style: draft.style,
    weight: draft.weight,
    height: draft.height,
    record: draft.record,
    status: draft.status,
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const limited = rateLimit({
    key: `invite-get:${hashedClientKey(req)}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const { code: raw } = await ctx.params;
  const code = normalizeInviteCode(raw);
  if (!code) return jsonError("Код не найден", 404);

  const draft = await findDraft(code);
  if (!draft) return jsonError("Код не найден", 404);
  return NextResponse.json(publicPayload(draft));
}

export async function POST(req: Request, ctx: Ctx) {
  const limited = rateLimit({
    key: `invite-act:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const { code: raw } = await ctx.params;
  const code = normalizeInviteCode(raw);
  if (!code) return jsonError("Код не найден", 404);

  const draft = await findDraft(code);
  if (!draft) return jsonError("Код не найден", 404);

  const next = { ...draft, status: "activated" as const };
  memoryUpsert([next]);

  const sb = createWarriorServiceClient();
  if (sb) {
    await sb
      .from("fighter_invite_drafts")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("invite_code", code);
  }

  return NextResponse.json(publicPayload(next));
}
