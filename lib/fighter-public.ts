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

export const DONATION_GOAL_MAX_LEN = 120;
export const NICKNAME_MAX_LEN = 48;

export type FighterPublicProfile = {
  id: string;
  slug: string;
  displayName: string;
  nickname: string | null;
  role: WarriorRole;
  bio: string | null;
  avatarUrl: string | null;
  record: string | null;
  club: string | null;
  weightClass: string | null;
  donationsTotalKop: number;
  donationGoal: string | null;
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

function parseDonationGoal(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, DONATION_GOAL_MAX_LEN);
}

function parseNickname(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, NICKNAME_MAX_LEN);
}

const PROFILE_SELECT_BASE = [
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
] as const;

function applyKnownCardDefaults(
  profile: FighterPublicProfile,
): FighterPublicProfile {
  if (profile.slug === "romanov") {
    return {
      ...profile,
      nickname: profile.nickname ?? "Уличный Боец",
      donationGoal: profile.donationGoal ?? "Сборы в Краснодар",
    };
  }
  return profile;
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
    nickname: parseNickname(row.nickname),
    role: resolveWarriorRole(row.role),
    bio: typeof row.bio === "string" ? row.bio : null,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    record: typeof row.record === "string" ? row.record : null,
    club: typeof row.club === "string" ? row.club : null,
    weightClass:
      typeof row.weight_class === "string" ? row.weight_class : null,
    donationsTotalKop: num(row.donations_total),
    donationGoal: parseDonationGoal(row.donation_goal),
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

const ROMANOV_DEMO: FighterPublicProfile = {
  id: "WP-COACH-001",
  slug: "romanov",
  displayName: "Сергей Романов",
  nickname: "Уличный Боец",
  role: "coach",
  bio: "MMA cage prep · sparring · fight camp.",
  avatarUrl:
    "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=900&q=80",
  record: null,
  club: "БК «Кузня»",
  weightClass: null,
  donationsTotalKop: 0,
  donationGoal: "Сборы в Краснодар",
  bookingEnabled: true,
  visibility: "public",
  hideWeightClass: false,
  hideClub: false,
  hideBio: false,
  hideRecord: false,
  verificationStatus: "none",
};

/** Demo fallback when Supabase has no row / migrations not applied. */
export function getDemoFighterBySlug(
  slug: string,
): FighterPublicProfile | null {
  if (slug === "romanov") return { ...ROMANOV_DEMO };
  if (slug !== "king") return null;
  return {
    id: DEMO_FIGHTER_DB_ID,
    slug: "king",
    displayName: "King León",
    nickname: null,
    role: "fighter",
    bio: "Демо-боец платформы Round 23. Промоушены: ACA, RCC, M-1 Global. Базовый зал — БК «Кузня».",
    avatarUrl: DEMO_FIGHTER_PORTRAIT,
    record: "27-4-1",
    club: DEMO_FIGHTER_CLUB,
    weightClass: DEMO_FIGHTER_WEIGHT_CLASS,
    donationsTotalKop: 0,
    donationGoal: null,
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

async function fetchCardExtras(
  client: SupabaseClient,
  slug: string,
): Promise<{ nickname: string | null; donationGoal: string | null }> {
  const extras = { nickname: null as string | null, donationGoal: null as string | null };
  const { data, error } = await client
    .from("profiles")
    .select("nickname, donation_goal")
    .eq("slug", slug)
    .maybeSingle();

  if (!error && data && typeof data === "object") {
    extras.nickname = parseNickname(
      (data as { nickname?: unknown }).nickname,
    );
    extras.donationGoal = parseDonationGoal(
      (data as { donation_goal?: unknown }).donation_goal,
    );
    return extras;
  }

  const nick = await client
    .from("profiles")
    .select("nickname")
    .eq("slug", slug)
    .maybeSingle();
  if (!nick.error && nick.data) {
    extras.nickname = parseNickname(
      (nick.data as { nickname?: unknown }).nickname,
    );
  }

  const goal = await client
    .from("profiles")
    .select("donation_goal")
    .eq("slug", slug)
    .maybeSingle();
  if (!goal.error && goal.data) {
    extras.donationGoal = parseDonationGoal(
      (goal.data as { donation_goal?: unknown }).donation_goal,
    );
  }

  return extras;
}

export async function fetchFighterBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<FighterPublicProfile | null> {
  const normalizedRaw = slug.trim().toLowerCase();
  const normalized = normalizedRaw;
  if (!normalized) return null;

  const query = await client
    .from("profiles")
    .select(PROFILE_SELECT_BASE.join(", "))
    .eq("slug", normalized)
    .maybeSingle();

  const { data, error } = query;
  const extras = await fetchCardExtras(client, normalized);

  if (!error && data && typeof data === "object") {
    const mapped = mapRow({
      ...(data as Record<string, unknown>),
      nickname: extras.nickname,
      donation_goal: extras.donationGoal,
    });
    if (mapped) {
      if (normalized === "romanov" || mapped.id === "WP-COACH-001") {
        const demo = getDemoFighterBySlug("romanov")!;
        return applyKnownCardDefaults({
          ...mapped,
          slug: mapped.slug || "romanov",
          donationGoal: mapped.donationGoal ?? extras.donationGoal ?? demo.donationGoal,
          nickname: mapped.nickname ?? extras.nickname ?? demo.nickname,
          displayName:
            mapped.displayName === "Боец" || !mapped.displayName.trim()
              ? demo.displayName
              : mapped.displayName,
          avatarUrl: mapped.avatarUrl ?? demo.avatarUrl,
          club: mapped.club ?? demo.club,
          bio: mapped.bio ?? demo.bio,
        });
      }
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
      return applyKnownCardDefaults(mapped);
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

  const fallback = getDemoFighterBySlug(normalized);
  return fallback ? applyKnownCardDefaults(fallback) : null;
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
  donationGoal?: string | null;
  nickname?: string | null;
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
  if (patch.donationGoal !== undefined) {
    const goal = parseDonationGoal(patch.donationGoal);
    row.donation_goal = goal;
  }
  if (patch.nickname !== undefined) {
    row.nickname = parseNickname(patch.nickname);
  }
  row.updated_at = new Date().toISOString();
  return row;
}
