/**
 * Warrior Point role model — personas of the platform.
 *
 *   admin   → full control: Agents Window, award winners, manage everyone.
 *   coach   → manages roster / splits, records sessions.
 *   fighter → owns passport / ledger / public fighter card.
 *   athlete → trains (member); same combat passport surface as fighter.
 *
 * DB: `profiles.roles TEXT[]` is source of truth (migration 0035).
 * Legacy `profiles.role TEXT` stays until callers migrate — prefer roles,
 * fall back to role. One person = one profiles row; roles is an array.
 */

export const WARRIOR_ROLES = ["admin", "coach", "fighter", "athlete"] as const;

export type WarriorRole = (typeof WARRIOR_ROLES)[number];

export const DEFAULT_ROLE: WarriorRole = "fighter";

export const DEFAULT_ROLES: readonly WarriorRole[] = [DEFAULT_ROLE];

export const ROLE_LABELS: Record<WarriorRole, string> = {
  admin: "Админ",
  coach: "Тренер",
  fighter: "Боец",
  athlete: "Атлет",
};

export function isWarriorRole(value: unknown): value is WarriorRole {
  return (
    typeof value === "string" &&
    WARRIOR_ROLES.includes(value as WarriorRole)
  );
}

/** Parse roles[] from DB (or a single legacy role string). */
export function resolveWarriorRoles(
  rolesValue: unknown,
  legacyRole?: unknown,
): WarriorRole[] {
  const out: WarriorRole[] = [];
  const push = (v: unknown) => {
    if (isWarriorRole(v) && !out.includes(v)) out.push(v);
  };

  if (Array.isArray(rolesValue)) {
    for (const item of rolesValue) push(item);
  } else if (typeof rolesValue === "string") {
    // Postgres sometimes returns "{fighter,coach}"
    const trimmed = rolesValue.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      for (const part of trimmed.slice(1, -1).split(",")) {
        push(part.trim().replace(/^"|"$/g, ""));
      }
    } else {
      push(trimmed);
    }
  }

  if (out.length === 0) push(legacyRole);
  if (out.length === 0) return [...DEFAULT_ROLES];
  return out;
}

/** Single primary role for UI that still switches on one value. */
export function resolveWarriorRole(
  value: unknown,
  rolesValue?: unknown,
): WarriorRole {
  if (rolesValue !== undefined) {
    return primaryRole(resolveWarriorRoles(rolesValue, value));
  }
  return isWarriorRole(value) ? value : DEFAULT_ROLE;
}

/**
 * Display / accent priority when several roles are present.
 * Admin wins for gates; coach before combatant for coach-ops accent.
 */
export function primaryRole(roles: readonly WarriorRole[]): WarriorRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("coach")) return "coach";
  if (roles.includes("athlete")) return "athlete";
  if (roles.includes("fighter")) return "fighter";
  return DEFAULT_ROLE;
}

export function hasRole(
  roles: readonly WarriorRole[] | WarriorRole | null | undefined,
  role: WarriorRole,
): boolean {
  if (roles == null) return false;
  if (typeof roles === "string") return roles === role;
  return roles.includes(role);
}

export function hasAnyRole(
  roles: readonly WarriorRole[] | WarriorRole | null | undefined,
  candidates: readonly WarriorRole[],
): boolean {
  return candidates.some((r) => hasRole(roles, r));
}

/** Admin if 'admin' in roles OR legacy role = 'admin'. */
export function isAdmin(
  roles: readonly WarriorRole[] | null | undefined,
  legacyRole?: unknown,
): boolean {
  if (hasRole(roles, "admin")) return true;
  return legacyRole === "admin";
}

/** Combatant card: fighter or athlete. */
export function isCombatantRole(
  roles: readonly WarriorRole[] | WarriorRole | null | undefined,
): boolean {
  return hasAnyRole(roles, ["fighter", "athlete"]);
}

/** Admins may manage every profile and grant awards. */
export function canManageWinners(
  roleOrRoles: WarriorRole | readonly WarriorRole[],
): boolean {
  return hasRole(roleOrRoles, "admin");
}

/** Coaches and admins may record training sessions on behalf of fighters. */
export function canRecordSessions(
  roleOrRoles: WarriorRole | readonly WarriorRole[],
): boolean {
  return hasAnyRole(roleOrRoles, ["admin", "coach"]);
}

export type WarriorProfile = Readonly<{
  id: string;
  displayName: string | null;
  /** Primary role (compat). Prefer `roles`. */
  role: WarriorRole;
  roles: readonly WarriorRole[];
  coachId: string | null;
}>;
