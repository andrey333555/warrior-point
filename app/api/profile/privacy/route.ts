import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import {
  DONATION_GOAL_MAX_LEN,
  NICKNAME_MAX_LEN,
  isProfileVisibility,
  privacyPatchToRow,
  type PrivacyPatch,
  type ProfileVisibility,
} from "@/lib/fighter-public";
import { canEditProfilePrivacy } from "@/lib/api-actor";
import { hashedClientKey, jsonError, readJsonBody, safeDbMessage } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedHttpsUrl } from "@/lib/https-url";

type Body = {
  actorId?: string;
  profileId?: string;
  bookingEnabled?: boolean;
  visibility?: string;
  hideWeightClass?: boolean;
  hideClub?: boolean;
  hideBio?: boolean;
  hideRecord?: boolean;
  slug?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  record?: string | null;
  donationGoal?: string | null;
  nickname?: string | null;
};

function writeClient() {
  return createWarriorServiceClient();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId")?.trim() ?? "";
  const actorId = url.searchParams.get("actorId")?.trim();
  if (!profileId || profileId.length > 128) {
    return jsonError("profileId обязателен", 400);
  }

  const gate = await canEditProfilePrivacy({
    actorId,
    profileId,
    adminSecret: req.headers.get("x-warrior-admin-secret"),
  });
  if (!gate.ok) {
    return jsonError(gate.message, gate.status);
  }

  const sb = writeClient();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      mock: true,
      privacy: {
        bookingEnabled: true,
        visibility: "public" as ProfileVisibility,
        hideWeightClass: false,
        hideClub: false,
        hideBio: false,
        hideRecord: false,
        slug: profileId === "WP-INTL-X9-441K" ? "king" : null,
        bio: null,
        avatarUrl: null,
        record: null,
        donationGoal: null,
        nickname: null,
      },
    });
  }

  const { data, error } = await sb
    .from("profiles")
    .select(
      "booking_enabled, visibility, hide_weight_class, hide_club, hide_bio, hide_record, slug, bio, avatar_url, record, donation_goal, nickname",
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    return jsonError(safeDbMessage(error.message), 502);
  }

  return NextResponse.json({
    ok: true,
    privacy: {
      bookingEnabled: data?.booking_enabled !== false,
      visibility: isProfileVisibility(data?.visibility)
        ? data.visibility
        : "public",
      hideWeightClass: data?.hide_weight_class === true,
      hideClub: data?.hide_club === true,
      hideBio: data?.hide_bio === true,
      hideRecord: data?.hide_record === true,
      slug: typeof data?.slug === "string" ? data.slug : null,
      bio: typeof data?.bio === "string" ? data.bio : null,
      avatarUrl: typeof data?.avatar_url === "string" ? data.avatar_url : null,
      record: typeof data?.record === "string" ? data.record : null,
      donationGoal:
        typeof data?.donation_goal === "string" ? data.donation_goal : null,
      nickname: typeof data?.nickname === "string" ? data.nickname : null,
    },
  });
}

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `privacy:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<Body>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  const profileId = body.profileId?.trim();
  if (!profileId) {
    return jsonError("profileId обязателен", 400);
  }

  const gate = await canEditProfilePrivacy({
    actorId: body.actorId,
    profileId,
    adminSecret: req.headers.get("x-warrior-admin-secret"),
  });
  if (!gate.ok) {
    return jsonError(gate.message, gate.status);
  }

  if (body.visibility !== undefined && !isProfileVisibility(body.visibility)) {
    return jsonError("visibility: public | limited | private", 400);
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) {
      return jsonError("slug: 3–48 символов, латиница, цифры, дефис", 400);
    }
  }

  if (typeof body.bio === "string" && body.bio.length > 2000) {
    return jsonError("bio слишком длинный", 400);
  }

  if (typeof body.avatarUrl === "string" && body.avatarUrl.trim()) {
    if (!isAllowedHttpsUrl(body.avatarUrl)) {
      return jsonError("avatarUrl: только https", 400);
    }
  }

  if (typeof body.record === "string" && body.record.trim()) {
    if (!/^[0-9]{1,3}-[0-9]{1,3}(-[0-9]{1,3})?$/.test(body.record.trim())) {
      return jsonError("record: формат W-L или W-L-D", 400);
    }
  }

  if (typeof body.donationGoal === "string" && body.donationGoal.trim().length > DONATION_GOAL_MAX_LEN) {
    return jsonError(`Цель доната: до ${DONATION_GOAL_MAX_LEN} символов`, 400);
  }

  if (typeof body.nickname === "string" && body.nickname.trim().length > NICKNAME_MAX_LEN) {
    return jsonError(`Никнейм: до ${NICKNAME_MAX_LEN} символов`, 400);
  }

  const patch: PrivacyPatch = {
    bookingEnabled: body.bookingEnabled,
    visibility: isProfileVisibility(body.visibility)
      ? body.visibility
      : undefined,
    hideWeightClass: body.hideWeightClass,
    hideClub: body.hideClub,
    hideBio: body.hideBio,
    hideRecord: body.hideRecord,
    slug: body.slug,
    bio: body.bio,
    avatarUrl: body.avatarUrl,
    record: body.record,
    donationGoal: body.donationGoal,
    nickname: body.nickname,
  };

  const row = privacyPatchToRow(patch);
  if (Object.keys(row).length <= 1) {
    return jsonError("Нет полей для обновления", 400);
  }

  const sb = writeClient();
  if (!sb) {
    return jsonError("Нужен SUPABASE_SERVICE_ROLE_KEY", 503);
  }

  const { error } = await sb.from("profiles").update(row).eq("id", profileId);
  if (error) {
    return jsonError(safeDbMessage(error.message), 502);
  }

  return NextResponse.json({ ok: true });
}
