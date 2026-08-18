import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  isProfileVisibility,
  privacyPatchToRow,
  type PrivacyPatch,
  type ProfileVisibility,
} from "@/lib/fighter-public";
import { canEditProfilePrivacy } from "@/lib/api-actor";

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
};

function client() {
  return createWarriorServiceClient() ?? createWarriorBrowserClient();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId")?.trim();
  const actorId = url.searchParams.get("actorId")?.trim();
  if (!profileId) {
    return NextResponse.json(
      { ok: false, message: "profileId обязателен" },
      { status: 400 },
    );
  }

  // Read: own profile or public fields — still require actorId for write-path symmetry
  // when loading settings UI (own only).
  if (actorId && actorId !== profileId) {
    const gate = await canEditProfilePrivacy({ actorId, profileId });
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, message: gate.message },
        { status: gate.status },
      );
    }
  }

  const sb = client();
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
      },
    });
  }

  const { data, error } = await sb
    .from("profiles")
    .select(
      "booking_enabled, visibility, hide_weight_class, hide_club, hide_bio, hide_record, slug, bio, avatar_url, record",
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 },
    );
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
    },
  });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const profileId = body.profileId?.trim();
  if (!profileId) {
    return NextResponse.json(
      { ok: false, message: "profileId обязателен" },
      { status: 400 },
    );
  }

  const gate = await canEditProfilePrivacy({
    actorId: body.actorId,
    profileId,
    adminSecret: req.headers.get("x-warrior-admin-secret"),
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, message: gate.message },
      { status: gate.status },
    );
  }

  if (body.visibility !== undefined && !isProfileVisibility(body.visibility)) {
    return NextResponse.json(
      { ok: false, message: "visibility: public | limited | private" },
      { status: 400 },
    );
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) {
      return NextResponse.json(
        {
          ok: false,
          message: "slug: 3–48 символов, латиница, цифры, дефис",
        },
        { status: 400 },
      );
    }
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
  };

  const row = privacyPatchToRow(patch);
  if (Object.keys(row).length <= 1) {
    return NextResponse.json(
      { ok: false, message: "Нет полей для обновления" },
      { status: 400 },
    );
  }

  const sb = client();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Supabase не настроен — сохранено локально на клиенте",
    });
  }

  const { error } = await sb.from("profiles").update(row).eq("id", profileId);
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
