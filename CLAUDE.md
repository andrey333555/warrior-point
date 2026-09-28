# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Round 23 (репозиторий: warrior-point)

## Что это
PWA-маркетплейс тренировок по единоборствам. Россия (старт — Краснодар), затем СНГ.
Клиент находит тренера → записывается на сплит → платит → приходит в зал → чекинится → получает Таланты.

## Экономика
- Сплит = групповая тренировка на 3-8 человек у одного тренера
- Клиент платит ~1000₽ (реальный рынок). Потолок у топ-тренеров — 15 000₽
- Платформа берёт 19% с тренировок (включая страховку) и 10% с донатов
- Тренер получает 81%
- Зал получает фикс за аренду слота (заложен в цену). Утренние часы 10:00-16:00 обычно пустые — их и продаём
- Смысл для тренера: сплит на 6 человек даёт вдвое больше, чем индивидуалка

## Термины (важно, не путать)
- Таланты — очки опыта за тренировки. Раньше назывались XP. Только копятся, потратить нельзя
- Раунд — уровень 1..23 по Фибоначчи. Открывает доступ к более сильным тренерам
- ELO — рейтинг силы бойца, отдельная сущность. Растёт от побед, а не от тренировок
- Сплит — групповая тренировка 3-8 человек
- Check-in — подтверждение присутствия: гео, QR, код тренера или взаимное

## Ловушки именования
- lib/subscription.ts — каталог VIP-планов платформы
- lib/subscriptions.ts — подписки пользователя на конкретных тренеров
Это РАЗНЫЕ сущности. Не путать, не объединять.

## Стек
Next.js 16 (App Router, Turbopack), TypeScript, Tailwind, Supabase, Vercel, ЮKassa

## Дизайн
- Золото #C9A84C — акценты и главные кнопки
- Фон #0A0A0A
- Все тексты на русском
- Мобильный приоритет, PWA

## Правила работы
- Владелец не программист. Объясняй решения на русском, кратко
- Сначала план, потом код
- Показывай diff до применения
- Не коммить без явной просьбы
- Говори о рисках прямо, не сглаживай
- Не добавляй новые библиотеки без согласования
- Миграции — только новым файлом в supabase/migrations/, существующие не редактировать
- Платежи, SQL-функции и экономику не трогать без явного «ок» от владельца
- Где не уверен — спрашивай, а не гадай

## Не трогать без спроса
- Логику расчёта комиссии 19/81
- Формулу Фибоначчи для раундов
- app/api/payment/*

## Команды
- `npm run dev` — dev-сервер на Turbopack, порт 3000
- `npm run build` — прод-сборка (`output: "standalone"` в next.config.ts — для Docker-деплоя на RF-хостинг)
- `npm start` — запуск собранного приложения
- `npm run lint` — ESLint (`eslint-config-next` core-web-vitals + typescript)
- Тестов в проекте нет (ни одного `*.test.*`/`*.spec.*`, test runner не подключён)
- Отдельного type-check нет: `next.config.ts` ставит `typescript.ignoreBuildErrors: true`, поэтому билд не падает на ошибках типов. Проверять вручную: `npx tsc --noEmit`
- Запуск одного файла/маршрута отдельно не поддерживается — только весь dev-сервер

## Архитектура

**Двойной режим данных (важно для любого нового `lib/*.ts`).** Почти каждый модуль в `lib/` умеет работать в двух режимах:
1. Supabase настроен (`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` есть) → авторитетные чтение/запись через сервер.
2. Supabase не настроен → откат на localStorage/in-memory demo-данные.

Это позволяет приложению работать полностью без env (демо-режим для скриншотов/презентаций). Паттерн: `createWarriorServiceClient() ?? createWarriorBrowserClient()`, клиенты возвращают `null` при отсутствии конфига, а вызывающий код сам решает падать или уходить в demo-fallback. `lib/client-store.ts` (`clientInitial`) — обёртка для SSR-safe чтения из localStorage (на сервере отдаёт `serverFallback`, на клиенте — реальные данные). `lib/store.ts` (`initAllStores`) прогревает кеши при монтировании (`<StoreInit />` в `app/layout.tsx`).

**Supabase-клиенты** (`lib/supabase/`):
- `client.ts` — browser-клиент на anon key, мемоизирован
- `server-admin.ts` — service-role клиент, только сервер, обходит RLS, для авторитетных начислений (платежи, XP, роли)
- `session-server.ts`, `read.ts`, `warrior-sync.ts`, `split-booking.ts`, `splits-sync.ts`, `donations.ts`, `provision-user.ts`, `admin-actions.ts` — доменные обёртки поверх этих двух клиентов
- Схема: `supabase/schema.sql` (база) + `supabase/migrations/0001…0022` (применять по порядку)

**Auth** (NextAuth, `app/api/auth/[...nextauth]`, конфиг в `lib/auth.ts`):
- Провайдеры: Google, Apple, кастомные OAuth Yandex/VK/Sber (руками собраны через `OAuthConfig`), `CredentialsProvider`, Telegram Mini App (HMAC-проверка `initData` в `lib/telegram-verify.ts`, обязателен `TELEGRAM_BOT_TOKEN`)
- `hooks/use-warrior-auth.ts` объединяет NextAuth-сессию с «гостевым режимом» — demo-паспорт без логина, работает и в проде, флаг в localStorage (`wp_guest_mode`), id = `DEMO_FIGHTER_DB_ID` («King», см. `lib/warrior-constants.ts`)
- **Любой API-роут с записью обязан биндить actor к сессии, а не доверять id из тела запроса.** Общие гейты: `lib/api-session.ts` (`requireBoundUserId`, `isDemoEconomyAllowed`, `isLiveEconomyLocked`) и `lib/api-actor.ts` (`canEditProfilePrivacy`, `canAccessAdmin`). В проде обязателен `LIVE_ECONOMY_LOCK=1`, иначе анонимные demo-начисления остаются возможны
- Серверный admin-обход — заголовок с `WARRIOR_ADMIN_SECRET` (только server env, никогда `NEXT_PUBLIC_*`)
- Роли: `lib/roles.ts` — `admin`/`coach`/`fighter`, зеркалит CHECK-constraint `profiles.role` в `supabase/schema.sql`

**Платежи** (`lib/payments/`): `create-intent.ts` создаёт `PaymentIntent`, `yookassa.ts` — клиент ЮKassa (`isYooKassaConfigured()` — фичефлаг по наличию ключей), `settle.ts`/`apply-rewards*.ts` — начисление после оплаты, `wallet-server.ts` — баланс. Роуты: `app/api/payment/{create,confirm,webhook,mock-pay}`. `mock-pay` — демо-оплата без реальных ключей ЮKassa.

**Экономика/уровни** (ядро из раздела «не трогать без спроса»):
- `lib/economy.ts` — `splitSettlement`/`calculateTotalTariff` (комиссия 19%), `donateSettlement` (донаты). **Внимание:** `DONATION_PLATFORM_FEE_PCT` в коде = 5%, а в разделе «Экономика» выше указано 10% — расхождение между кодом и документом, стоит сверить с владельцем, какое значение верное
- `lib/levels.ts` — 23 раунда по Фибоначчи (`ROUNDS`), тиры (Новичок/Боец/Ветеран/Элита/Легенда), хелперы прогресса XP

**Check-in** (`lib/checkin-server.ts`): HMAC-подписанные QR/тренерские коды на `CHECKIN_SECRET` (фоллбэк — `NEXTAUTH_SECRET`), ротация по слотам времени (`lib/verify.ts`, `CODE_ROTATION_MS`). Роуты: `app/api/checkin/{code,qr,verify}`.

**i18n** (`lib/i18n/`): 9 локалей СНГ — `ru` (дефолт), `en`, `uk`, `be`, `kk`, `uz`, `az`, `hy`, `ky`; словари в `lib/i18n/dictionaries/*.ts`, типизированы через `WarriorDictionary`. План раскатки — `docs/i18n-plan.md`. Это не противоречит правилу «все тексты на русском» выше — CIS-локали пока инфраструктура на будущее, дефолт и текущий UI остаются на русском.

**Структура app/**: App Router, один сегмент маршрута на экран (`booking`, `chat`, `check-in`, `fighter`, `gym`, `profile`, `trainer`, `vip`, …), логика экрана вынесена в `components/*-page.tsx` (client component), сам `app/.../page.tsx` — тонкая обёртка. Корень `app/page.tsx` — шелл: `AuthGate`, если не авторизован; иначе `HomeHub` (дефолт) или legacy `TacticalOS` при `?tab=passport|leaderboard`.

**Alias**: `@/*` → корень репозитория (`tsconfig.json`).

**Деплой**: прод сейчас на Vercel. `Dockerfile` + `docker-compose.yml` — для self-host на RF-инфре (Selectel/Yandex Cloud), см. `docs/rf-hosting-checklist.md`. Именно под этот сценарий в `next.config.ts` стоит `output: "standalone"`.

**AGENTS.md**: в репозитории лежит `AGENTS.md`, требующий перед правками сверяться с `node_modules/next/dist/docs/` — в Next.js 16 есть ломающие изменения относительно обучающих данных модели. Стоит следовать этому при работе с App Router API, которые выглядят непривычно.
