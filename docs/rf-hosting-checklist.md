# Чеклист РФ-хостинга (152-ФЗ) · Round 23

Текущий прод: Vercel (`https://warrior-point.vercel.app`) · app **v0.2.0** · обновление 19 авг 2026.  
Цель: VM Selectel или Yandex Cloud + БД в РФ (Supabase self-host или Managed PostgreSQL в РФ).

## 1. Перед переносом

- [ ] Применить миграции `supabase/migrations/0001` … `0022` (+ `schema.sql` на пустой БД)
- [ ] Скопировать env с Vercel → `.env` на сервере (см. ниже)
- [ ] `NEXTAUTH_URL` = ваш РФ-домен `https://…`
- [ ] OAuth redirect URI обновить на РФ-домен
- [ ] Webhook ЮKassa: `https://<rf-domain>/api/payment/webhook`
- [ ] Патентный поиск / Роспатент / ЕАПВ — после рабочей версии (вне кода)

## 2. Обязательные env на сервере

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://your-rf-domain.ru
YOOKASSA_SHOP_ID=          # когда нужна живая оплата
YOOKASSA_SECRET_KEY=
TELEGRAM_BOT_TOKEN=        # если Telegram-вход
```

Опционально OAuth: Google / Apple / Yandex / VK / Sber.

## 3. Docker на VM

```bash
git clone <repo> && cd warrior-point
# положить .env.local с секретами
docker compose up --build -d
```

Образ: `Dockerfile` (Next.js `output: "standalone"`).

## 4. 152-ФЗ / ПДн (минимум)

- [ ] Сервер и БД в юрисдикции РФ
- [ ] HTTPS (nginx/Caddy + Let’s Encrypt)
- [ ] Политика обработки ПДн + согласие при регистрации
- [ ] Право на экспорт / удаление данных (админка soft-delete — каркас; hard-delete — доработать)
- [ ] Бэкапы БД (ежедневно) + шифрование дисков
- [ ] Ограничить `SUPABASE_SERVICE_ROLE_KEY` только серверу
- [ ] Логи доступа админов

## 5. Платежи

Сейчас: один магазин ЮKassa, сплит 19/81 в ledger (`lib/economy.ts`).  
**ЮKassa Marketplace / API-сплиты** — отдельное ТЗ (вариант 2Б). Не включено в этот каркас.

## 6. Проверка после деплоя

- [ ] `https://<domain>/` — HomeHub
- [ ] `https://<domain>/fighter/king` — публичная карточка
- [ ] `https://<domain>/settings` — приватность
- [ ] `https://<domain>/admin?admin=1` — список профилей
- [ ] `https://<domain>/verify` — KYC stub
- [ ] Оплата mock / ЮKassa + webhook

## 7. Не делается без доступов к облаку

Смена DNS, перенос данных Supabase → РФ PG, продакшен на Selectel/Yandex — только после выдачи ключей и проекта в облаке.
