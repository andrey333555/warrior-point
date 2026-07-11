import type { PaymentIntent } from "@/lib/payments/types";
import { buildPaymentSettlement } from "@/lib/payments/settle";
import { creditProfileBalance } from "@/lib/payments/wallet-server";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { recordServerTrainingSession } from "@/lib/supabase/session-server";

/**
 * Server-side reward application on the pending → succeeded transition.
 *
 * Writes the verified `training_sessions` row, advances `fighter_stats` XP,
 * and credits cashback to `profiles.balance` — all with the service-role
 * client. Runs from the webhook (real YooKassa) and mock-pay (demo).
 */
export async function applyServerPaymentRewards(
  intent: PaymentIntent,
): Promise<void> {
  if (!intent.fighterId) return;

  const client = createWarriorServerWriteClient();
  if (!client) return;

  const result = await recordServerTrainingSession(client, {
    fighterId: intent.fighterId,
    grossRub: intent.grossRub,
    sessionType: "marketplace_booking",
  });

  if (!result.ok) {
    console.warn(
      `[payments] server reward application failed for ${intent.id}: ${result.message}`,
    );
    return;
  }

  const settlement = buildPaymentSettlement(intent.grossRub);
  if (settlement.cashbackRub > 0) {
    const wallet = await creditProfileBalance(
      client,
      intent.fighterId,
      settlement.cashbackRub,
    );
    if (!wallet.ok) {
      console.warn(
        `[payments] cashback credit failed for ${intent.id}: ${wallet.message}`,
      );
    }
  }
}
