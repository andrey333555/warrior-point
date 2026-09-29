-- 0028_gyms.sql
-- Зачем: каталог залов в базе (раньше жил только в lib/gyms.ts) + сид БК «Кузня» · ЦСЕ «Сокол».

CREATE TABLE IF NOT EXISTS public.gyms (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'kuznya',
  network         TEXT NOT NULL DEFAULT 'kuznya',
  city            TEXT NOT NULL,
  address         TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  coach_id        TEXT REFERENCES public.profiles (id) ON DELETE SET NULL,
  coach_name      TEXT,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  phone           TEXT,
  instagram       TEXT,
  website         TEXT,
  accent          TEXT NOT NULL DEFAULT 'cyan',
  pending         BOOLEAN NOT NULL DEFAULT FALSE,
  schedule        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_category_check;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_category_check
  CHECK (category IN ('kuznya', 'fight_club', 'wrestling', 'partner_slot'));

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_network_check;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_network_check
  CHECK (network IN ('kuznya', 'nart', 'bulldog', 'samson', 'kickbox', 'independent'));

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_accent_check;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_accent_check
  CHECK (accent IN ('cyan', 'fuchsia', 'amber', 'emerald', 'violet', 'rose'));

CREATE INDEX IF NOT EXISTS gyms_city_idx ON public.gyms (city);
CREATE INDEX IF NOT EXISTS gyms_network_idx ON public.gyms (network);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_gyms_select" ON public.gyms;
CREATE POLICY "warrior_anon_gyms_select"
  ON public.gyms FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.gyms FROM anon, authenticated;
GRANT SELECT ON public.gyms TO anon, authenticated;

-- БК «Кузня» · ЦСЕ «Сокол», Краснодар, ул. Береговая, 9
-- Координаты WGS-84: 45.015096, 38.966952 (2ГИС · спорткомплекс «Сокол»).
INSERT INTO public.gyms (
  id, name, category, network, city, address, lat, lng,
  coach_id, coach_name, specializations, phone, instagram, accent, pending, schedule
) VALUES (
  'kuznya-krd-sokol',
  'БК «Кузня»',
  'kuznya',
  'kuznya',
  'Краснодар',
  'ул. Береговая, 9 (ЦСЕ «Сокол»)',
  45.015096,
  38.966952,
  'WP-COACH-001',
  'Сергей Романов',
  ARRAY['Бокс', 'Тайский бокс', 'MMA', 'Рукопашный бой', 'Функциональный тренинг'],
  '+7 918 430-03-30',
  '@kuznya_fight_club',
  'cyan',
  FALSE,
  '[
    {"discipline":"Бокс","times":"Вт–Чт 17:30, Сб 09:00","phone":"+7 918 430-03-30"},
    {"discipline":"Тайский бокс","times":"Вт–Чт 19:00, Сб 11:00","phone":"+7 909 458-98-00"},
    {"discipline":"ММА / рукопашный (7–13 лет)","times":"Пн–Ср–Пт 17:30","phone":"+7 952 856-03-10, +7 952 465-71-56"},
    {"discipline":"Смешанные единоборства (14+)","times":"Пн–Ср–Пт 19:00","phone":"+7 900 286-58-30, +7 908 678-17-00"},
    {"discipline":"Функциональный тренинг","times":"Ср 16:00, Сб 10:00","phone":null}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  category        = EXCLUDED.category,
  network         = EXCLUDED.network,
  city            = EXCLUDED.city,
  address         = EXCLUDED.address,
  lat             = EXCLUDED.lat,
  lng             = EXCLUDED.lng,
  coach_id        = EXCLUDED.coach_id,
  coach_name      = EXCLUDED.coach_name,
  specializations = EXCLUDED.specializations,
  phone           = EXCLUDED.phone,
  instagram       = EXCLUDED.instagram,
  accent          = EXCLUDED.accent,
  pending         = EXCLUDED.pending,
  schedule        = EXCLUDED.schedule,
  updated_at      = NOW();

NOTIFY pgrst, 'reload schema';
