import type { BookingType } from "@/lib/bookings";
import type { SettlementBreakdown } from "@/lib/economy";

export type PaymentStatus = "pending" | "succeeded" | "canceled";

export type PaymentIntent = {
  id: string;
  yookassaId?: string;
  status: PaymentStatus;
  /** Fighter (profile id) paying for the session — server rewards target. */
  fighterId?: string;
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
  fighterId?: string;
  trainerId: number;
  trainerName: string;
  gymName: string;
  date: string;
  time: string;
  trainingType: BookingType;
  grossRub?: number;
  origin?: string;
};
