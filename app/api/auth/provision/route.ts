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

type ProvisionBody = {
  accessToken?: string;
  displayName?: string;
  calibration?: {
    skillTier?: string;
    record?: { wins?: number; losses?: number; draws?: number };
    startingElo?: number;
    verified?: boolean;
  };
};

function parseCalibration(
  c: ProvisionBody["calibration"],
): ProvisionCalibration | undefined {
  if (!c || !isSkillTier(c.skillTier) || typeof c.startingElo !== "number" || typeof c.verified !== "boolean") {
    return undefined;
  }
  return {
    skillTier: c.skillTier,
    record: {
      wins: c.record?.wins ?? 0,
      losses: c.record?.losses ?? 0,
      draws: c.record?.draws ?? 0,
    },
    startingElo: c.startingElo,
    verified: c.verified,
  };
}

/**
 * Provision a profiles/fighter_stats row for a Supabase-Auth user
 * (email/password sign-up or first login after email confirmation).
 *
 * The caller never gets to claim a userId directly — the access token
 * issued by Supabase Auth is verified server-side and the user id is
 * read out of that, never out of the request body.
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
  const fallbackName = userData.user.email?.split("@")[0] ?? "Воин";

  const { error } = await provisionNewWarrior(
    service,
    userId,
    body.displayName?.trim() || fallbackName,
    parseCalibration(body.calibration),
  );

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, userId });
}
