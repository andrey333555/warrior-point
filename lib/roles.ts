/**
 * Warrior Point role model — the three personas of the platform.
 *
 *   admin   → full control: Agents Window, award winners, manage everyone.
 *   coach   → manages a roster of fighters, records their sessions.
 *   fighter → owns their own passport / ledger.
 *
 * Mirrors the `profiles.role` CHECK constraint in `supabase/schema.sql`.
 */

export const WARRIOR_ROLES = ["admin", "coach", "fighter"] as const;

export type WarriorRole = (typeof WARRIOR_ROLES)[number];

export const DEFAULT_ROLE: WarriorRole = "fighter";

export const ROLE_LABELS: Record<WarriorRole, string> = {
  admin: "Админ",
  coach: "Тренер",
  fighter: "Боец",
};

export function isWarriorRole(value: unknown): value is WarriorRole {
  return (
    typeof value === "string" && WARRIOR_ROLES.includes(value as WarriorRole)
  );
}

export function resolveWarriorRole(value: unknown): WarriorRole {
  return isWarriorRole(value) ? value : DEFAULT_ROLE;
}

/** Admins may manage every profile and grant awards. */
export function canManageWinners(role: WarriorRole): boolean {
  return role === "admin";
}

/** Coaches and admins may record training sessions on behalf of fighters. */
export function canRecordSessions(role: WarriorRole): boolean {
  return role === "admin" || role === "coach";
}

export type WarriorProfile = Readonly<{
  id: string;
  displayName: string | null;
  role: WarriorRole;
  coachId: string | null;
}>;
