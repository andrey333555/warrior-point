/** Human-facing alias from ledger slug (`WP-INTL-…`). */
export function formatFighterLedgerName(slug: string): string {
  const parts = slug.split("-").filter(Boolean);

  if (parts.length === 0) return slug;

  return parts.join(" · ");
}
