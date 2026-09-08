import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { canAccessAdmin } from "@/lib/api-actor";
import { hashedClientKey, jsonError, readJsonBody, safeDbMessage } from "@/lib/api-request";
import { isDemoEconomyAllowed, isLiveEconomyLocked } from "@/lib/api-session";
import { rateLimit } from "@/lib/rate-limit";
import {
  activationEmail,
  activationSms,
  buildInviteUrl,
  draftIdentityKey,
  makeInviteCode,
  makeSlug,
  parseFighterCsv,
  parseRecord,
  type FighterImportRow,
  type FighterInviteDraft,
} from "@/lib/fighter-import";
import {
  memoryFindByIdentity,
  memoryGetByCode,
  memoryListDrafts,
  memoryUpsert,
  memoryUsedCodes,
  memoryUsedSlugs,
} from "@/lib/fighter-import-store";

const IMPORT_JSON_BYTES = 200_000;

async function gateFighterImport(opts: {
  actorId?: string | null;
  adminSecret?: string | null;
}) {
  const gate = await canAccessAdmin({
    actorId: opts.actorId,
    write: true,
    adminSecret: opts.adminSecret,
  });
  if (gate.ok) return gate;
  if (isDemoEconomyAllowed() && !isLiveEconomyLocked()) {
    return {
      ok: true as const,
      role: "admin" as const,
      canDelete: true,
      actorId: opts.actorId ?? null,
    };
  }
  return gate;
}

type DraftStatus = FighterInviteDraft["status"];

function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return url.origin;
  }
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  return configured || url.origin;
}

function asDraft(row: Record<string, unknown>): FighterInviteDraft | null {
  const inviteCode = typeof row.invite_code === "string" ? row.invite_code : "";
  const name = typeof row.name === "string" ? row.name : "";
  if (!inviteCode || !name) return null;
  const status: DraftStatus =
    row.status === "activated" || row.status === "invited" ? row.status : "draft";
  const weightRaw = row.weight;
  const heightRaw = row.height;
  return {
    inviteCode,
    profileId: typeof row.profile_id === "string" ? row.profile_id : `WP-IMP-${inviteCode}`,
    slug: typeof row.slug === "string" ? row.slug : inviteCode.toLowerCase(),
    name,
    city: typeof row.city === "string" ? row.city : "",
    club: typeof row.club === "string" ? row.club : "",
    style: typeof row.style === "string" ? row.style : "mma",
    weight: typeof weightRaw === "number" ? weightRaw : Number(weightRaw) || undefined,
    height: typeof heightRaw === "number" ? heightRaw : Number(heightRaw) || undefined,
    record: typeof row.record === "string" ? row.record : undefined,
    status,
  };
}

async function loadDbDrafts(sb: SupabaseClient): Promise<FighterInviteDraft[]> {
  const { data, error } = await sb
    .from("fighter_invite_drafts")
    .select(
      "invite_code, profile_id, slug, name, city, club, style, weight, height, record, status",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => asDraft(row as Record<string, unknown>)).filter(Boolean) as FighterInviteDraft[];
}

function toExport(draft: FighterInviteDraft, origin: string) {
  const url = buildInviteUrl(draft.inviteCode, origin);
  const email = activationEmail(draft.name, url);
  return {
    ...draft,
    url,
    sms: activationSms(draft.name, url),
    emailSubject: email.subject,
    emailBody: email.body,
  };
}

async function insertPassport(
  sb: SupabaseClient,
  draft: FighterInviteDraft,
): Promise<void> {
  const rec = parseRecord(draft.record);
  const profile: Record<string, unknown> = {
    id: draft.profileId,
    display_name: draft.name,
    role: "fighter",
    club: draft.club || null,
    specialization: draft.style || null,
    weight_class: draft.weight ? `${draft.weight} кг` : null,
    fighter_status: "Draft",
    bio: "Черновик паспорта. Ждёт активации.",
    record: draft.record ?? null,
    slug: draft.slug,
    visibility: "private",
    booking_enabled: false,
    verification_status: "pending",
    updated_at: new Date().toISOString(),
  };

  let payload = { ...profile };
  let { error } = await sb.from("profiles").upsert(payload, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  for (let i = 0; i < 8 && error; i++) {
    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (!miss || !(miss[1] in payload)) break;
    const { [miss[1]]: _drop, ...rest } = payload;
    payload = rest;
    const retry = await sb.from("profiles").upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
    error = retry.error;
  }

  const stats: Record<string, unknown> = {
    fighter_id: draft.profileId,
    total_xp: 0,
    current_level: 1,
    monthly_xp: 0,
    record_wins: rec.wins,
    record_losses: rec.losses,
    record_draws: rec.draws,
    wins: rec.wins,
    losses: rec.losses,
    draws: rec.draws,
    current_status: "Draft · ждёт активации",
    updated_at: new Date().toISOString(),
  };
  let statsPayload = { ...stats };
  let statsErr = (
    await sb.from("fighter_stats").upsert(statsPayload, {
      onConflict: "fighter_id",
      ignoreDuplicates: true,
    })
  ).error;
  for (let i = 0; i < 8 && statsErr; i++) {
    const miss = statsErr.message.match(/Could not find the '([^']+)' column/);
    if (!miss || !(miss[1] in statsPayload)) break;
    const { [miss[1]]: _drop, ...rest } = statsPayload;
    statsPayload = rest;
    statsErr = (
      await sb.from("fighter_stats").upsert(statsPayload, {
        onConflict: "fighter_id",
        ignoreDuplicates: true,
      })
    ).error;
  }
}

async function persistDrafts(
  created: FighterInviteDraft[],
): Promise<{ persisted: "supabase" | "memory"; warning?: string }> {
  const sb = createWarriorServiceClient();
  if (sb) {
    const rows = created.map((d) => ({
      invite_code: d.inviteCode,
      profile_id: d.profileId,
      slug: d.slug,
      name: d.name,
      city: d.city || null,
      club: d.club || null,
      style: d.style || null,
      weight: d.weight ?? null,
      height: d.height ?? null,
      record: d.record ?? null,
      status: d.status,
    }));
    const { error } = await sb.from("fighter_invite_drafts").insert(rows);
    if (!error) {
      for (const draft of created) {
        await insertPassport(sb, draft);
      }
      return { persisted: "supabase" };
    }
    if (!isDemoEconomyAllowed()) {
      throw Object.assign(new Error(error.message), { db: true });
    }
    memoryUpsert(created);
    return {
      persisted: "memory",
      warning: "Таблица fighter_invite_drafts недоступна. Примените миграцию 0026. Сейчас коды только в памяти сервера.",
    };
  }

  if (isLiveEconomyLocked()) {
    throw Object.assign(new Error("Нужен SUPABASE_SERVICE_ROLE_KEY"), {
      status: 503,
    });
  }

  memoryUpsert(created);
  return {
    persisted: "memory",
    warning:
      "Нет SUPABASE_SERVICE_ROLE_KEY. Черновики живут до рестарта сервера. Для запуска примените 0026.",
  };
}

async function existingCatalog(): Promise<FighterInviteDraft[]> {
  const sb = createWarriorServiceClient();
  if (sb) {
    try {
      const fromDb = await loadDbDrafts(sb);
      memoryUpsert(fromDb);
      return fromDb;
    } catch {
      if (!isDemoEconomyAllowed()) throw new Error("db");
    }
  }
  return memoryListDrafts();
}

export async function GET(req: Request) {
  const limited = rateLimit({
    key: `admin-fig-imp-get:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const url = new URL(req.url);
  const gate = await gateFighterImport({
    actorId: url.searchParams.get("actorId")?.trim(),
    adminSecret: req.headers.get("x-warrior-admin-secret"),
  });
  if (!gate.ok) return jsonError(gate.message, gate.status);

  try {
    const drafts = await existingCatalog();
    const origin = requestOrigin(req);
    return NextResponse.json({
      ok: true,
      persisted: createWarriorServiceClient() ? "supabase" : "memory",
      drafts: drafts.map((d) => toExport(d, origin)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return jsonError(safeDbMessage(message), 502);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `admin-fig-imp-post:${hashedClientKey(req)}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<{
    actorId?: string;
    csv?: string;
    rows?: FighterImportRow[];
    preview?: boolean;
  }>(req, IMPORT_JSON_BYTES);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);

  const gate = await gateFighterImport({
    actorId: parsed.body.actorId,
    adminSecret: req.headers.get("x-warrior-admin-secret"),
  });
  if (!gate.ok) return jsonError(gate.message, gate.status);

  let rows = parsed.body.rows ?? [];
  let issues = [] as { line: number; message: string }[];
  if (typeof parsed.body.csv === "string") {
    const parsedCsv = parseFighterCsv(parsed.body.csv);
    rows = parsedCsv.rows;
    issues = parsedCsv.issues;
  }

  if (parsed.body.preview) {
    return NextResponse.json({ ok: true, rows, issues });
  }

  if (!rows.length) {
    return jsonError(issues[0]?.message ?? "Нет строк для импорта", 400);
  }

  let catalog: FighterInviteDraft[];
  try {
    catalog = await existingCatalog();
  } catch {
    return jsonError("Сервер не готов · примените миграции", 502);
  }

  const usedCodes = memoryUsedCodes();
  const usedSlugs = memoryUsedSlugs();
  for (const d of catalog) {
    usedCodes.add(d.inviteCode.toUpperCase());
    usedSlugs.add(d.slug);
  }
  const byIdentity = new Map(catalog.map((d) => [draftIdentityKey(d), d]));

  const created: FighterInviteDraft[] = [];
  const skipped: FighterInviteDraft[] = [];

  for (const row of rows) {
    const existing =
      byIdentity.get(draftIdentityKey(row)) ??
      memoryFindByIdentity(row.name, row.club, row.city);
    if (existing) {
      skipped.push(existing);
      continue;
    }
    const inviteCode = makeInviteCode(row.name, usedCodes);
    if (memoryGetByCode(inviteCode)) continue;
    const slug = makeSlug(row.name, usedSlugs);
    const draft: FighterInviteDraft = {
      ...row,
      inviteCode,
      profileId: `WP-IMP-${inviteCode}`,
      slug,
      status: "draft",
    };
    created.push(draft);
    byIdentity.set(draftIdentityKey(draft), draft);
  }

  try {
    const persist: { persisted: "supabase" | "memory"; warning?: string } =
      created.length
        ? await persistDrafts(created)
        : { persisted: createWarriorServiceClient() ? "supabase" : "memory" };
    const origin = requestOrigin(req);
    return NextResponse.json({
      ok: true,
      persisted: persist.persisted,
      warning: persist.warning,
      issues,
      created: created.map((d) => toExport(d, origin)),
      skipped: skipped.map((d) => toExport(d, origin)),
    });
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 502;
    const message = err instanceof Error ? err.message : "";
    return jsonError(
      status === 503 ? message : safeDbMessage(message),
      status === 503 ? 503 : 502,
    );
  }
}
