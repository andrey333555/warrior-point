/** @deprecated use usePayment from @/lib/usePayment */
export {
  type PaymentInput as StartFightPaymentInput,
  type PaymentResult as StartFightPaymentResult,
  createPayment as startFightPayment,
  usePayment,
  PAYMENT_API,
} from "@/lib/usePayment";
