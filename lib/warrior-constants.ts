/** Human-facing demo fighter name (HUD hero). */
export const DEMO_FIGHTER_DISPLAY_NAME = "Боец Бойцов";

/** Full legal name for profiles / official records. */
export const DEMO_FIGHTER_FULL_NAME = "Боец Бойцов";

/** Passport display glyph (shown in HUD as ID badge). */
export const DEMO_FIGHTER_DISPLAY_ID = "WP·INTL·X9·441K";

/** Row key aligned with PK in `fighter_stats` / `training_sessions`. */
export const DEMO_FIGHTER_DB_ID = DEMO_FIGHTER_DISPLAY_ID.replace(/·/g, "-");

/** Initials for HexAvatar fallback when no portrait is bound. */
export const DEMO_FIGHTER_INITIALS = "ББ";

/** Official club affiliation. */
export const DEMO_FIGHTER_CLUB = 'БК «Кузня» (Анапа / Краснодар)';

/** Promotions the demo fighter has competed in (for display). */
export const DEMO_FIGHTER_PROMOTIONS = "ACA · RCC · M-1 Global · Marathon 360";

/** Primary weight class. */
export const DEMO_FIGHTER_WEIGHT_CLASS = "Featherweight 66 кг / Lightweight 70.3 кг";

/** Head coach name. */
export const DEMO_FIGHTER_COACH = "Олег Владимирович";

/** Demo combat score showcase value. */
export const DEMO_COMBAT_SCORE = 92.4 as const;

/** Portrait for demo fighter passport (hero + avatar). */
export const DEMO_FIGHTER_PORTRAIT =
  "https://images.unsplash.com/photo-1552072805-f9a7be36c5c9?w=1200&q=85&auto=format&fit=crop&crop=faces";
