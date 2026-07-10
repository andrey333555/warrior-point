/**
 * Round 23 · ЮKassa — инструкция подключения
 *
 * Флоу:
 *   1. Клиент жмёт «Войти в бой» → usePayment().pay()
 *   2. POST /api/payment/create → редирект на ЮKassa
 *   3. Клиент платит (карта / SberPay / СБП)
 *   4. ЮKassa шлёт POST /api/payment/webhook
 *   5. Платформа забирает 19%, тренеру 81%
 *   6. Возврат на /session/complete → XP + кэшбэк
 */

export const PAYMENT_INTEGRATION_GUIDE = {
  env: {
    YOOKASSA_SHOP_ID: "ID магазина из личного кабинета ЮKassa",
    YOOKASSA_SECRET_KEY: "Секретный ключ API",
  },

  routes: {
    create: "/api/payment/create",
    webhook: "/api/payment/webhook",
    confirm: "/api/payment/confirm",
    mockPay: "/api/payment/mock-pay",
    returnPage: "/session/complete",
  },

  webhookUrl: "https://warrior-point.vercel.app/api/payment/webhook",

  settlementExample: {
    grossRub: 2000,
    platformCommissionRub: 380,
    trainerNetRub: 1620,
    commissionPct: 19,
  },

  hookUsage: `
import { usePayment } from "@/lib/usePayment";

const { paying, error, pay, clearError } = usePayment();

await pay({
  trainerId: 1,
  trainerName: "Иван Дроздов",
  gymName: "Tiger Gym",
  date: "Сегодня",
  time: "18:00",
  trainingType: "split",
  grossRub: 2000,
});
`,

  steps: [
    "Добавь YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env.local",
    "В кабинете ЮKassa укажи webhook: /api/payment/webhook",
    "События: payment.succeeded, payment.canceled",
    "Кнопку оплаты подключи через usePayment()",
    "После оплаты клиент попадает на /session/complete?paymentId=...",
    "Без ключей ЮKassa работает mock: /api/payment/mock-pay",
  ],
} as const;

export function getPaymentWebhookUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/payment/webhook`;
}
