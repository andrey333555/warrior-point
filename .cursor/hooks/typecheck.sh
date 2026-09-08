#!/bin/bash
# Warrior Point — ошибка типов не должна доживать до деплоя.
# Запускается в конце хода агента. Если в TS есть ошибки, агент обязан их починить,
# не отчитываясь о готовности. next build на Vercel падает на том же самом.

set -uo pipefail

cat >/dev/null 2>&1 || true   # hook input не нужен, но stdin надо вычитать

cd "$(dirname "$0")/../.." 2>/dev/null || exit 0

command -v git >/dev/null 2>&1 || exit 0

# Правок в TypeScript не было — не тратим время на проверку.
changed=$(git status --porcelain -- '*.ts' '*.tsx' 2>/dev/null)
if [ -z "$changed" ]; then
  exit 0
fi

# .next/types — сгенерированный мусор со дублями, не наш код.
errors=$(npx --no-install tsc --noEmit 2>&1 \
  | grep 'error TS' \
  | grep -v '^\.next/types' \
  | head -20)

if [ -z "$errors" ]; then
  exit 0
fi

if command -v jq >/dev/null 2>&1; then
  printf 'Проверка типов упала. Почини до отчёта о готовности — на этом же падает next build:\n%s\n' "$errors" \
    | jq -Rs '{followup_message: .}'
else
  echo "{}"
fi

exit 0
