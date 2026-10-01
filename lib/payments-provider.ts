/**
 * Tip / donation payment mode.
 * Server-only env PAYMENTS_PROVIDER — never expose secrets to the client.
 * Client code receives only a boolean (commission UI on/off).
 */

export type PaymentsProvider = "manual" | "yookassa";

/** Default is manual until YooKassa is wired. */
export function resolvePaymentsProvider(
  raw: string | undefined | null = process.env.PAYMENTS_PROVIDER,
): PaymentsProvider {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "yookassa") return "yookassa";
  return "manual";
}

/** True only when PAYMENTS_PROVIDER=yookassa — show tip commission checkbox. */
export function isDonationCommissionEnabled(
  raw?: string | null,
): boolean {
  return resolvePaymentsProvider(raw) === "yookassa";
}
