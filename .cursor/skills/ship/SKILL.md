---
name: ship
description: Pre-deploy gate for Warrior Point — runs type check, lint, production build, and the prod-blocker subagent, then reports go/no-go in Russian. Use before pushing to Vercel, before launch, or when the user asks whether it is safe to deploy.
disable-model-invocation: true
---

# Перед деплоем

Гоняй по порядку. Первый красный шаг — стоп, дальше не идём.

## 1. Типы

```bash
npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v '^\.next/types' | head -20
```

Пусто — хорошо. `.next/types` игнорируем: это сгенерированный мусор.

## 2. Линт

```bash
npx next lint --max-warnings=0 2>&1 | tail -40
```

Ошибки чиним. Предупреждения, которые были в репозитории до нашей правки, не чиним — за сутки до запуска это не приоритет. Скажи владельцу, какие оставили.

## 3. Сборка

```bash
npx next build 2>&1 | tail -40
```

Это ровно то, что запустит Vercel. Если падает здесь — задеплоенная версия не поднимется.

## 4. Уязвимости

```bash
npm audit --omit=dev 2>&1 | tail -20
```

Блокер — только `critical`/`high` в проде. `moderate` в dev-зависимостях запуск не держит.

## 5. Продовые блокеры

Позови субагента `prod-blocker`. Он смотрит то, чего не видит сборка: пустые env на Vercel, открытая RLS, непримененные миграции, mock-платежи в проде.

## 6. Непримененные миграции

```bash
ls supabase/migrations | tail -5
```

Сверь с тем, что реально накатано в Supabase. Файл в репозитории ≠ таблица в базе. Это самая частая причина «на локале работало».

## Отчёт

Заканчивай так, без воды:

```
Деплой: можно / нельзя

Красное (держит запуск):
- …

Жёлтое (переживём, но знай):
- …

Руками до трафика:
- применить миграции NNNN
- проверить env на Vercel: …
```

Не коммить и не пушить без явной просьбы. Твоя работа — сказать «можно», а не нажать кнопку.
