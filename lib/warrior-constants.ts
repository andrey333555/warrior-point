/** Human-facing fighter name (HUD hero). */
export const DEMO_FIGHTER_DISPLAY_NAME = "Виктор Колесник";

/** Full legal name for profiles / official records. */
export const DEMO_FIGHTER_FULL_NAME = "Колесник Виктор Григорьевич";

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

/** Official club affiliation. */
export const DEMO_FIGHTER_CLUB = 'БК «Кузня» (Анапа / Краснодар)';

/** Promotions Viktor has competed in (for display). */
export const DEMO_FIGHTER_PROMOTIONS = "ACA · RCC · M-1 Global · Marathon 360";

/** Primary weight class. */
export const DEMO_FIGHTER_WEIGHT_CLASS = "Featherweight 66 кг / Lightweight 70.3 кг";

/** Head coach name. */
export const DEMO_FIGHTER_COACH = "Олег Владимирович";
