import type { PaymentIntent } from "@/lib/payments/types";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import {
  rpcApplyPaymentRewards,
  type PaymentRewardRpc,
} from "@/lib/supabase/economy-rpc";

/**
 * Server-side reward application on the pending → succeeded transition.
 * Idempotent RPC: one payment = one XP mint + one cashback credit.
 */
export async function applyServerPaymentRewards(
  intent: PaymentIntent,
): Promise<PaymentRewardRpc> {
  if (!intent.fighterId) {
    return { ok: false, status: 402, message: "Платёж без бойца" };
  }

  const client = createWarriorServerWriteClient();
  if (!client) {
    return {
      ok: false,
      status: 503,
      message: "Supabase не настроен",
    };
  }

  return rpcApplyPaymentRewards(client, intent.id);
}
