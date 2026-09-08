import type { FighterInviteDraft } from "@/lib/fighter-import";
import { draftIdentityKey } from "@/lib/fighter-import";

const drafts = new Map<string, FighterInviteDraft>();

export function memoryListDrafts(): FighterInviteDraft[] {
  return [...drafts.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function memoryGetByCode(code: string): FighterInviteDraft | null {
  return drafts.get(code.toUpperCase()) ?? null;
}

export function memoryUpsert(rows: FighterInviteDraft[]): void {
  for (const row of rows) {
    drafts.set(row.inviteCode.toUpperCase(), row);
  }
}

export function memoryFindByIdentity(
  name: string,
  club: string,
  city: string,
): FighterInviteDraft | null {
  const key = draftIdentityKey({ name, club, city });
  for (const row of drafts.values()) {
    if (draftIdentityKey(row) === key) return row;
  }
  return null;
}

export function memoryUsedCodes(): Set<string> {
  return new Set(drafts.keys());
}

export function memoryUsedSlugs(): Set<string> {
  return new Set([...drafts.values()].map((d) => d.slug));
}
