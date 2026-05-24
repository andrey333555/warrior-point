# Warrior Point · план мультиязычности (i18n)

> **Статус:** структура подготовлена, интеграция с UI и роутингом — задача следующей сессии.

## Что уже есть в репо

- `lib/i18n/locales.ts` — реестр локалей: `ru`, `en`, `uk`, `be`, `kk`, `uz`, `az`, `hy`, `ky` + helpers (`resolveWarriorLocale`, `isWarriorLocale`).
- `lib/i18n/types.ts` — строго типизированный `WarriorDictionary` (включая функции-форматтеры: `xp.toNextGate`, `payouts.fee`, `levelUp.surge`, …).
- `lib/i18n/dictionaries/{ru,en}.ts` — **полностью переведённые словари** (русский — каноничный, английский — паритет).
- `lib/i18n/dictionaries/{uk,be,kk,uz,az,hy,ky}.ts` — заглушки: переведены только `meta.tagline`, `nav`, `language`. Остальное наследуется из `ru` с пометкой `TODO: native review`.
- `lib/i18n/index.ts` — `getDictionary(locale)` и `getDictionaryByHint(rawHeader)`.

## План на следующую сессию

### 1 · Роутинг и определение языка (App Router · Next 16)

Решить, как мы пробрасываем локаль:

- **Вариант A — префиксы пути:** `/[locale]/(routes)` с `middleware.ts`, который читает `Accept-Language` / cookie `warrior_locale` и редиректит на `/<locale>/...`. Дружелюбно к SEO, гост‑шер‑ссылкам и SSR.
- **Вариант B — cookie‑only:** один корневой `/`, локаль из cookie, переключатель ставит cookie + `router.refresh()`. Проще, но без локализованных URL.

Рекомендация: **A**. Карта файлов под него:

```
app/[locale]/layout.tsx
app/[locale]/page.tsx          → Warrior Passport
app/[locale]/leaderboard/page.tsx
middleware.ts                   → детект + редирект
```

### 2 · Передача словаря в компоненты

- Серверные страницы: `const { dict } = getDictionaryByHint(params.locale)` → пробросить через props в клиентские компоненты.
- Клиентские (`WarriorPassport`, `CyberStatTile`): принимают `dict` как пропс. Никакого глобального React Context на старте — проще тестировать.
- Альтернатива на будущее: `WarriorI18nProvider` поверх `useContext` для глубоко вложенных кусков.

### 3 · Рефактор существующих экранов на ключи

Все строки на странице сейчас захардкожены. Заменить на словарь:

- `components/warrior-passport.tsx` → `dict.passport.*` (есть полный набор ключей).
- `app/leaderboard/page.tsx` → `dict.leaderboard.*`.
- `components/cyber-nav.tsx` → `dict.nav.*`.
- `app/layout.tsx` → `<html lang={locale}>`, `metadata` локализованная (`generateMetadata`).

### 4 · Переключатель языка

`components/locale-switch.tsx` (Client Component):

- Выпадающий список с `LOCALE_LABELS[locale].native` (родное название) + латинский подзаголовок.
- Сохраняет выбор в cookie `warrior_locale` (`Max-Age=31536000`, `SameSite=Lax`).
- Использует `router.replace` с подменой первого сегмента пути на новую локаль.

Стиль — Cyber‑Loft: те же неоновые токены, что у `CyberNav`. Кнопка в правом нижнем углу или в шапке.

### 5 · Локализация чисел и валют

- Текущие `Intl.NumberFormat("ru-RU", { currency: "RUB" })` заменить на `Intl.NumberFormat(locale, ...)` → корректное форматирование рубля/доллара/тенге/сома и т.д.
- В `WarriorDictionary` опционально добавить `currencyDisplay` для будущей мультивалютности.

### 6 · SEO / OpenGraph

- В `app/[locale]/layout.tsx` сделать `generateMetadata` с `alternates.languages` (hreflang) на все поддерживаемые локали.
- `app/[locale]/sitemap.ts` — генерировать карту сайта для каждой локали.

### 7 · Качество переводов (родная вычитка)

Для каждой локали‑заглушки запланировать native review:

| Локаль | Native | Статус | Ответственный |
|--------|--------|--------|---------------|
| `ru` | Русский | ✅ canon | — |
| `en` | English | ✅ canon | — |
| `uk` | Українська | ⚠️ draft + RU fallback | TBD |
| `be` | Беларуская | ⚠️ draft + RU fallback | TBD |
| `kk` | Қазақша | ⚠️ draft + RU fallback | TBD |
| `uz` | Oʻzbekcha | ⚠️ draft + RU fallback | TBD |
| `az` | Azərbaycanca | ⚠️ draft + RU fallback | TBD |
| `hy` | Հայերեն | ⚠️ draft + RU fallback | TBD |
| `ky` | Кыргызча | ⚠️ draft + RU fallback | TBD |

### 8 · CI / контроль ключей

- Скрипт `scripts/check-i18n.ts`: грузит каждый словарь, валидирует через `WarriorDictionary`, проверяет, что у любых локалей нет «висячих» ключей и нет лишних / отсутствующих относительно `ru`.
- Прогнать в `npm run lint` или отдельной таргетом `npm run i18n:check`.

### 9 · Будущие задачи (S+2, опционально)

- Подключить `next-intl` или `@formatjs/intl` если потребуются ICU plural rules (например, `«1 сессия / 2 сессии / 5 сессий»` для русского).
- RTL‑готовность (на CIS — не нужно, но если добавим арабский/иврит — заложить `dir={dict.meta.dir}`).
- Динамический code‑split словарей: вместо `import` всех — `await import(`./dictionaries/${locale}`)` на сервере (экономит JS клиента, словари ≈10 KB каждый).

---

**Приоритет следующей сессии:** пункты 1‑4. Это даст рабочий переключатель языка и `ru/en` боевыми. Остальные локали подтянутся постепенно по мере появления нативной вычитки.
