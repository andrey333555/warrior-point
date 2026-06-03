-- Warrior Point · Migration 0007 — Organisations & Fighter-Org records
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Organisations master table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  accent_color TEXT,
  country      TEXT NOT NULL DEFAULT 'RU',
  website      TEXT,
  logo_key     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_organisations_select" ON public.organisations;
CREATE POLICY "warrior_anon_organisations_select"
  ON public.organisations FOR SELECT TO anon USING (true);

-- ── Fighter ↔ Organisation records ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fighter_orgs (
  id                    UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  fighter_id            TEXT NOT NULL,
  org_id                TEXT NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  contract_status       TEXT NOT NULL DEFAULT 'alumni'
                          CHECK (contract_status IN ('active', 'inactive', 'alumni')),
  league_wins           INTEGER NOT NULL DEFAULT 0,
  league_losses         INTEGER NOT NULL DEFAULT 0,
  league_draws          INTEGER NOT NULL DEFAULT 0,
  last_fight_opponent   TEXT,
  last_fight_date       DATE,
  last_fight_result     TEXT CHECK (last_fight_result IN ('W', 'L', 'D')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fighter_id, org_id)
);

ALTER TABLE public.fighter_orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_fighter_orgs_all" ON public.fighter_orgs;
CREATE POLICY "warrior_anon_fighter_orgs_all"
  ON public.fighter_orgs FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS fighter_orgs_fighter_idx ON public.fighter_orgs (fighter_id);
CREATE INDEX IF NOT EXISTS fighter_orgs_org_idx     ON public.fighter_orgs (org_id);

-- ── Seed organisations ────────────────────────────────────────────────────────

INSERT INTO public.organisations (id, name, short_name, accent_color, country, website, logo_key)
VALUES
  ('aca',        'Absolute Championship Akhmat',     'ACA',  '#facc15', 'RU', 'https://acafights.com',    'AcaLogo'),
  ('rcc',        'Russian Cagefighting Championship','RCC',  '#f87171', 'RU', 'https://rcc.ru',            'RccLogo'),
  ('m1',         'M-1 Global',                       'M-1',  '#22d3ee', 'RU', 'https://m-1.tv',            'M1Logo'),
  ('amc',        'AMC Fight Nights',                 'AMC',  '#34d399', 'RU', 'https://fight-nights.com',  'AmcLogo'),
  ('hardcore',   'Hardcore MMA',                     'HC',   '#e879f9', 'RU', NULL,                        'HardcoreLogo'),
  ('topdog',     'Top Dog',                          'TD',   '#fb7185', 'RU', 'https://topdog.ru',         'TopDogLogo'),
  ('marathon360','Marathon 360',                     'M360', '#a78bfa', 'RU', NULL,                        'Marathon360Logo')
ON CONFLICT (id) DO UPDATE
  SET name         = EXCLUDED.name,
      short_name   = EXCLUDED.short_name,
      accent_color = EXCLUDED.accent_color,
      website      = EXCLUDED.website,
      logo_key     = EXCLUDED.logo_key;

-- ── Seed Viktor Kolesnik fighter_orgs records ─────────────────────────────────

INSERT INTO public.fighter_orgs
  (fighter_id, org_id, contract_status, league_wins, league_losses, league_draws,
   last_fight_opponent, last_fight_date, last_fight_result, notes)
VALUES
  ('WP-INTL-X9-441K', 'aca',        'active',  5, 2, 0, 'Нэйт Лэндвер',    '2024-03-15', 'W', 'Действующий контракт'),
  ('WP-INTL-X9-441K', 'rcc',        'alumni',  4, 1, 1, 'Расул Мирзаев',   '2022-11-05', 'L', NULL),
  ('WP-INTL-X9-441K', 'm1',         'alumni', 12, 1, 0, 'Ёсики Накахара',  '2021-09-18', 'W', '12 выступлений'),
  ('WP-INTL-X9-441K', 'marathon360','alumni',  5, 0, 0, 'Кэйсукэ Сасу',   '2020-06-27', 'W', NULL)
ON CONFLICT (fighter_id, org_id) DO UPDATE
  SET contract_status     = EXCLUDED.contract_status,
      league_wins         = EXCLUDED.league_wins,
      league_losses       = EXCLUDED.league_losses,
      league_draws        = EXCLUDED.league_draws,
      last_fight_opponent = EXCLUDED.last_fight_opponent,
      last_fight_date     = EXCLUDED.last_fight_date,
      last_fight_result   = EXCLUDED.last_fight_result,
      notes               = EXCLUDED.notes,
      updated_at          = NOW();

NOTIFY pgrst, 'reload schema';
