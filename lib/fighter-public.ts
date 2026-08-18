import type { SupabaseClient } from "@supabase/supabase-js";
import type { WarriorRole } from "@/lib/roles";
import { resolveWarriorRole } from "@/lib/roles";
import {
  DEMO_FIGHTER_CLUB,
  DEMO_FIGHTER_DB_ID,
  DEMO_FIGHTER_PORTRAIT,
  DEMO_FIGHTER_WEIGHT_CLASS,
} from "@/lib/warrior-constants";

export const PROFILE_VISIBILITY = ["public", "limited", "private"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

export const VERIFICATION_STATUS = [
  "none",
  "pending",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export type FighterPublicProfile = {
  id: string;
  slug: string;
  displayName: string;
  role: WarriorRole;
  bio: string | null;
  avatarUrl: string | null;
  record: string | null;
  club: string | null;
  weightClass: string | null;
  donationsTotalKop: number;
  bookingEnabled: boolean;
  visibility: ProfileVisibility;
  hideWeightClass: boolean;
  hideClub: boolean;
  hideBio: boolean;
  hideRecord: boolean;
  verificationStatus: VerificationStatus;
};

export type PublicCardView = {
  mode: "full" | "minimal";
  showWeightClass: boolean;
  showClub: boolean;
  showBio: boolean;
  showRecord: boolean;
  showBooking: boolean;
  showDonations: boolean;
};

export function isProfileVisibility(v: unknown): v is ProfileVisibility {
  return (
    typeof v === "string" &&
    PROFILE_VISIBILITY.includes(v as ProfileVisibility)
  );
}

export function isVerificationStatus(v: unknown): v is VerificationStatus {
  return (
    typeof v === "string" &&
    VERIFICATION_STATUS.includes(v as VerificationStatus)
  );
}

/** Resolve what a viewer may see on a public fighter card. */
export function resolvePublicCardView(
  profile: FighterPublicProfile,
  viewerRole: WarriorRole | null,
): PublicCardView {
  const privileged = viewerRole === "admin" || viewerRole === "coach";
  const fullAccess =
    profile.visibility === "public" ||
    (profile.visibility === "limited" && privileged);

  if (!fullAccess) {
    return {
      mode: "minimal",
      showWeightClass: false,
      showClub: false,
      showBio: false,
      showRecord: false,
      showBooking: false,
      showDonations: true,
    };
  }

  return {
    mode: "full",
    showWeightClass: !profile.hideWeightClass,
    showClub: !profile.hideClub,
    showBio: !profile.hideBio,
    showRecord: !profile.hideRecord,
    showBooking: profile.bookingEnabled,
    showDonations: true,
  };
}

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(row: Record<string, unknown>): FighterPublicProfile | null {
  const id = typeof row.id === "string" ? row.id : null;
  const slug = typeof row.slug === "string" ? row.slug : null;
  if (!id || !slug) return null;

  return {
    id,
    slug,
    displayName:
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name
        : "Боец",
    role: resolveWarriorRole(row.role),
    bio: typeof row.bio === "string" ? row.bio : null,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    record: typeof row.record === "string" ? row.record : null,
    club: typeof row.club === "string" ? row.club : null,
    weightClass:
      typeof row.weight_class === "string" ? row.weight_class : null,
    donationsTotalKop: num(row.donations_total),
    bookingEnabled: row.booking_enabled !== false,
    visibility: isProfileVisibility(row.visibility)
      ? row.visibility
      : "public",
    hideWeightClass: row.hide_weight_class === true,
    hideClub: row.hide_club === true,
    hideBio: row.hide_bio === true,
    hideRecord: row.hide_record === true,
    verificationStatus: isVerificationStatus(row.verification_status)
      ? row.verification_status
      : "none",
  };
}

/** Demo fallback when Supabase has no row / migrations not applied. */
export function getDemoFighterBySlug(
  slug: string,
): FighterPublicProfile | null {
  if (slug !== "king") return null;
  return {
    id: DEMO_FIGHTER_DB_ID,
    slug: "king",
    displayName: "King León",
    role: "fighter",
    bio: "Демо-боец платформы Round 23. Промоушены: ACA, RCC, M-1 Global. Базовый зал — БК «Кузня».",
    avatarUrl: DEMO_FIGHTER_PORTRAIT,
    record: "27-4-1",
    club: DEMO_FIGHTER_CLUB,
    weightClass: DEMO_FIGHTER_WEIGHT_CLASS,
    donationsTotalKop: 0,
    bookingEnabled: true,
    visibility: "public",
    hideWeightClass: false,
    hideClub: false,
    hideBio: false,
    hideRecord: false,
    verificationStatus: "none",
  };
}

/** Strip PII for anonymous SSR / private·limited public cards. */
export function redactFighterForAnonymous(
  profile: FighterPublicProfile,
): FighterPublicProfile {
  if (profile.visibility === "public") {
    return {
      ...profile,
      bio: profile.hideBio ? null : profile.bio,
      club: profile.hideClub ? null : profile.club,
      weightClass: profile.hideWeightClass ? null : profile.weightClass,
      record: profile.hideRecord ? null : profile.record,
    };
  }

  return {
    ...profile,
    bio: null,
    club: null,
    weightClass: null,
    record: null,
    bookingEnabled: false,
  };
}

export async function fetchFighterBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<FighterPublicProfile | null> {
  const normalizedRaw = slug.trim().toLowerCase();
  const normalized = normalizedRaw;
  if (!normalized) return null;

  const { data, error } = await client
    .from("profiles")
    .select(
      [
        "id",
        "display_name",
        "role",
        "slug",
        "bio",
        "avatar_url",
        "record",
        "club",
        "weight_class",
        "donations_total",
        "booking_enabled",
        "visibility",
        "hide_weight_class",
        "hide_club",
        "hide_bio",
        "hide_record",
        "verification_status",
      ].join(", "),
    )
    .eq("slug", normalized)
    .maybeSingle();

  if (!error && data && typeof data === "object") {
    const mapped = mapRow(data as unknown as Record<string, unknown>);
    if (mapped) {
      // Fill empty public card fields from showcase demo.
      if (normalized === "king" || mapped.id === DEMO_FIGHTER_DB_ID) {
        const demo = getDemoFighterBySlug("king")!;
        return {
          ...mapped,
          slug: mapped.slug || "king",
          bio: mapped.bio ?? demo.bio,
          record: mapped.record ?? demo.record,
          avatarUrl: mapped.avatarUrl ?? demo.avatarUrl,
          club: mapped.club ?? demo.club,
          weightClass: mapped.weightClass ?? demo.weightClass,
          displayName:
            mapped.displayName === "Боец" || !mapped.displayName.trim()
              ? demo.displayName
              : mapped.displayName,
        };
      }
      return mapped;
    }
  }

  // Fallback: slug column missing — resolve demo fighter by id
  if (normalized === "king") {
    const { data: byId } = await client
      .from("profiles")
      .select("id, display_name, role, bio, club, weight_class")
      .eq("id", DEMO_FIGHTER_DB_ID)
      .maybeSingle();

    if (byId) {
      const base = getDemoFighterBySlug("king")!;
      const rawName =
        typeof byId.display_name === "string" ? byId.display_name : "";
      return {
        ...base,
        displayName: rawName.trim() ? rawName : base.displayName,
        bio: typeof byId.bio === "string" ? byId.bio : base.bio,
        club: typeof byId.club === "string" ? byId.club : base.club,
        weightClass:
          typeof byId.weight_class === "string"
            ? byId.weight_class
            : base.weightClass,
      };
    }
  }

  return getDemoFighterBySlug(normalized);
}

export type PrivacyPatch = {
  bookingEnabled?: boolean;
  visibility?: ProfileVisibility;
  hideWeightClass?: boolean;
  hideClub?: boolean;
  hideBio?: boolean;
  hideRecord?: boolean;
  slug?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  record?: string | null;
};

export function privacyPatchToRow(
  patch: PrivacyPatch,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.bookingEnabled !== undefined)
    row.booking_enabled = patch.bookingEnabled;
  if (patch.visibility !== undefined) row.visibility = patch.visibility;
  if (patch.hideWeightClass !== undefined)
    row.hide_weight_class = patch.hideWeightClass;
  if (patch.hideClub !== undefined) row.hide_club = patch.hideClub;
  if (patch.hideBio !== undefined) row.hide_bio = patch.hideBio;
  if (patch.hideRecord !== undefined) row.hide_record = patch.hideRecord;
  if (patch.slug !== undefined) row.slug = patch.slug.trim().toLowerCase();
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.record !== undefined) row.record = patch.record;
  row.updated_at = new Date().toISOString();
  return row;
}
