/** Human-facing fighter name (HUD hero). */
export const DEMO_FIGHTER_DISPLAY_NAME = "Виктор Колесник";

/** Passport display glyph (shown in HUD as ID badge). */
export const DEMO_FIGHTER_DISPLAY_ID = "WP·INTL·X9·441K";

/** Row key aligned with PK in `fighter_stats` / `training_sessions`. */
export const DEMO_FIGHTER_DB_ID = DEMO_FIGHTER_DISPLAY_ID.replace(/·/g, "-");

/** Initials for HexAvatar fallback when no portrait is bound. */
export const DEMO_FIGHTER_INITIALS = DEMO_FIGHTER_DISPLAY_NAME.split(/\s+/)
  .filter(Boolean)
  .map((part) => part[0]?.toUpperCase() ?? "")
  .slice(0, 2)
  .join("");
