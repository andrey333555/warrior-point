import type { SupabaseClient } from "@supabase/supabase-js";
import type { FundraiserProgress } from "@/lib/supabase/donations";

/** Shared quick amounts for card + donate modal. */
export const FUNDRAISING_QUICK_AMOUNTS = [300, 500, 1000, 5000] as const;

export type FundraisingCampaign = {
  fighterId: string;
  title: string;
  description: string | null;
  goalAmount: number;
  raisedAmount: number;
  deadline: string | null;
  commissionPercent: number;
  isActive: boolean;
};

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Column DEFAULT 7 — use only when the field is absent, never to overwrite a real 0. */
export const DEFAULT_CAMPAIGN_COMMISSION_PERCENT = 7;

/**
 * Tip commission (display-only, integer rubles).
 * cover ON:  pay = round(amount * (1+pct/100)), fighter = amount
 * cover OFF: fighter = round(amount * (1-pct/100)), pay line hidden in UI
 * pct = 0:   fighter = amount, no commission UI
 */
export function coverCommissionBreakdown(
  amountRub: number,
  commissionPercent: number,
  cover: boolean,
): {
  chosenRub: number;
  fighterRub: number;
  payRub: number;
  feeRub: number;
  pct: number;
  cover: boolean;
} {
  const chosenRub = Math.max(0, Math.round(amountRub));
  const pct = Math.max(0, Number(commissionPercent) || 0);

  if (pct <= 0) {
    return {
      chosenRub,
      fighterRub: chosenRub,
      payRub: chosenRub,
      feeRub: 0,
      pct: 0,
      cover: false,
    };
  }

  if (cover) {
    const payRub = Math.round(chosenRub * (1 + pct / 100));
    return {
      chosenRub,
      fighterRub: chosenRub,
      payRub,
      feeRub: payRub - chosenRub,
      pct,
      cover: true,
    };
  }

  const fighterRub = Math.round(chosenRub * (1 - pct / 100));
  return {
    chosenRub,
    fighterRub,
    payRub: chosenRub,
    feeRub: chosenRub - fighterRub,
    pct,
    cover: false,
  };
}

/** Tip-only fundraiser when no active campaign row exists. */
export function tipOnlyFundraiserProgress(): FundraiserProgress {
  return emptyFundraiserProgress({
    title: "Поддержать бойца",
    description: null,
    goalRub: 0,
    raisedRub: 0,
    pct: 0,
    deadline: null,
    commissionPercent: DEFAULT_CAMPAIGN_COMMISSION_PERCENT,
  });
}

/** Typed empty progress — no fake goals. commissionPercent defaults to 7. */
export function emptyFundraiserProgress(
  overrides?: Partial<FundraiserProgress>,
): FundraiserProgress {
  return {
    title: "",
    description: null,
    goalRub: 0,
    raisedRub: 0,
    pct: 0,
    deadline: null,
    commissionPercent: DEFAULT_CAMPAIGN_COMMISSION_PERCENT,
    ...overrides,
  };
}

export function campaignToFundraiser(
  campaign: FundraisingCampaign,
): FundraiserProgress {
  const goalRub = campaign.goalAmount;
  const raisedRub = campaign.raisedAmount;
  const pct =
    goalRub > 0 ? Math.min(100, Math.round((raisedRub / goalRub) * 100)) : 0;
  return {
    title: campaign.title,
    description: campaign.description,
    goalRub,
    raisedRub,
    pct,
    deadline: campaign.deadline,
    commissionPercent: campaign.commissionPercent,
  };
}

export function daysLeftFromDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  if (!Number.isFinite(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function mapCampaignRow(row: Record<string, unknown>): FundraisingCampaign | null {
  const fighterId =
    typeof row.fighter_id === "string" ? row.fighter_id : null;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!fighterId || !title) return null;

  return {
    fighterId,
    title,
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    goalAmount: Math.max(0, num(row.goal_amount)),
    raisedAmount: Math.max(0, num(row.raised_amount)),
    deadline:
      typeof row.deadline === "string" && row.deadline ? row.deadline : null,
    commissionPercent: parseCommissionPercent(row),
    isActive: row.is_active !== false,
  };
}

/** Real 0 stays 0. Missing/null column → DEFAULT 7. */
function parseCommissionPercent(row: Record<string, unknown>): number {
  if (
    !("commission_percent" in row) ||
    row.commission_percent === null ||
    row.commission_percent === undefined
  ) {
    return DEFAULT_CAMPAIGN_COMMISSION_PERCENT;
  }
  return Math.max(0, num(row.commission_percent));
}

/**
 * Active campaign for a fighter. Returns null if none — callers must not invent one.
 * Reads `public.campaigns` (anon SELECT via RLS; writes fail-closed).
 */
export async function fetchActiveCampaign(
  client: SupabaseClient,
  fighterId: string,
): Promise<FundraisingCampaign | null> {
  const id = fighterId.trim();
  if (!id) return null;

  const { data, error } = await client
    .from("campaigns")
    .select(
      "fighter_id, title, description, goal_amount, raised_amount, deadline, commission_percent, is_active",
    )
    .eq("fighter_id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data || typeof data !== "object") return null;
  return mapCampaignRow(data as Record<string, unknown>);
}

export function formatDonationTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "только что";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн. назад`;
}
