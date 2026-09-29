import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import {
  provisionNewWarrior,
  type ProvisionCalibration,
} from "@/lib/supabase/provision-user";
import type { SkillTier } from "@/lib/calibration";

export const runtime = "nodejs";

const SKILL_TIERS: readonly SkillTier[] = ["novice", "amateur", "pro"];
function isSkillTier(v: unknown): v is SkillTier {
  return typeof v === "string" && (SKILL_TIERS as readonly string[]).includes(v);
}

type RawCalibration = {
  skillTier?: unknown;
  record?: { wins?: unknown; losses?: unknown; draws?: unknown };
  startingElo?: unknown;
  verified?: unknown;
};

type ProvisionBody = {
  accessToken?: string;
  displayName?: string;
  /** Fallback only — see parseCalibration() usage below. */
  calibration?: RawCalibration;
};

function parseCalibration(c: unknown): ProvisionCalibration | undefined {
  if (!c || typeof c !== "object") return undefined;
  const raw = c as RawCalibration;
  if (
    !isSkillTier(raw.skillTier) ||
    typeof raw.startingElo !== "number" ||
    typeof raw.verified !== "boolean"
  ) {
    return undefined;
  }
  const record = (raw.record ?? {}) as RawCalibration["record"];
  return {
    skillTier: raw.skillTier,
    record: {
      wins: typeof record?.wins === "number" ? record.wins : 0,
      losses: typeof record?.losses === "number" ? record.losses : 0,
      draws: typeof record?.draws === "number" ? record.draws : 0,
    },
    startingElo: raw.startingElo,
    verified: raw.verified,
  };
}

/**
 * Provision a profiles/fighter_stats row for a Supabase-Auth user
 * (email/password sign-up, first login after email confirmation, or the
 * email-confirmation redirect itself — see the SIGNED_IN handler in
 * hooks/use-warrior-auth.ts, which is what actually calls this now).
 *
 * The caller never gets to claim a userId directly — the access token
 * issued by Supabase Auth is verified server-side and the user id is read
 * out of that, never out of the request body.
 *
 * Idempotent by construction: if a profile row already exists for this
 * user, we return early and never touch it — this route is now called on
 * every sign-in, not just once at registration, so it must never overwrite
 * an existing profile (balance, XP, role, etc. would all be at risk
 * otherwise).
 */
export async function POST(req: Request) {
  let body: ProvisionBody;
  try {
    body = (await req.json()) as ProvisionBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const accessToken = body.accessToken?.trim();
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, message: "accessToken обязателен" },
      { status: 400 },
    );
  }

  const service = createWarriorServiceClient();
  if (!service) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Supabase не настроен — профиль будет создан локально",
    });
  }

  const { data: userData, error: userErr } = await service.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, message: "Невалидный или истёкший токен сессии" },
      { status: 401 },
    );
  }

  const userId = userData.user.id;

  const { data: existing, error: existingErr } = await service
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json(
      { ok: false, message: existingErr.message },
      { status: 502 },
    );
  }

  if (existing) {
    return NextResponse.json({ ok: true, userId, alreadyProvisioned: true });
  }

  const meta = (userData.user.user_metadata ?? {}) as {
    full_name?: unknown;
    calibration?: unknown;
  };

  const fallbackName = userData.user.email?.split("@")[0] ?? "Воин";
  const displayName =
    body.displayName?.trim() ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    fallbackName;

  // user_metadata (set at signUp) is the source of truth — durable, not
  // device-bound. body.calibration is only a fallback, sourced from
  // localStorage on the client for accounts that signed up before that.
  const calibration = parseCalibration(meta.calibration) ?? parseCalibration(body.calibration);

  const { error } = await provisionNewWarrior(service, userId, displayName, calibration);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, userId });
}
