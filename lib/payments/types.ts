import type { BookingType } from "@/lib/bookings";
import type { SettlementBreakdown } from "@/lib/economy";

export type PaymentStatus = "pending" | "succeeded" | "canceled";

export type PaymentIntent = {
  id: string;
  yookassaId?: string;
  status: PaymentStatus;
  trainerId: number;
  trainerName: string;
  gymName: string;
  date: string;
  time: string;
  trainingType: BookingType;
  grossRub: number;
  breakdown: SettlementBreakdown;
  bookingId: string;
  createdAt: string;
  settledAt?: string;
};

export type PaymentSettlement = {
  breakdown: SettlementBreakdown;
  cashbackRub: number;
  xpAward: number;
  trainerNetRub: number;
  platformCommissionRub: number;
};

export type CreatePaymentInput = {
  trainerId: number;
  trainerName: string;
  gymName: string;
  date: string;
  time: string;
  trainingType: BookingType;
  grossRub?: number;
  origin?: string;
};
