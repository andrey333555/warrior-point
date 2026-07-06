/**
 * Unified store initialisation.
 * Call initAllStores() once on app mount to warm up every cache
 * so the first useXxx() call in any component gets instant data.
 */

import { getBookings } from "@/lib/bookings";
import { getXp } from "@/lib/xp";
import { getGoals, ensureDefaultGoals } from "@/lib/goals";
import { getReviews } from "@/lib/reviews";
import { getSubscriptions } from "@/lib/subscriptions";

export type StoreSnapshot = {
  bookingsCount: number;
  xpTotal: number;
  xpLevel: number;
  goalsCount: number;
  reviewsCount: number;
  subscriptionsCount: number;
};

let initialised = false;

export function initAllStores(): StoreSnapshot {
  if (initialised) {
    return currentSnapshot();
  }
  initialised = true;

  try {
    const bookings = getBookings();
    const xpState = getXp();
    const _reviews = getReviews();
    const _subscriptions = getSubscriptions();

    ensureDefaultGoals(bookings.length);
    const goals = getGoals();

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[store] Initialised — bookings:${bookings.length} xp:${xpState.total} goals:${goals.length}`,
      );
    }

    return {
      bookingsCount: bookings.length,
      xpTotal: xpState.total,
      xpLevel: Math.floor(xpState.total / 100),
      goalsCount: goals.length,
      reviewsCount: _reviews.length,
      subscriptionsCount: _subscriptions.length,
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[store] initAllStores failed:", err);
    }
    return {
      bookingsCount: 0,
      xpTotal: 0,
      xpLevel: 0,
      goalsCount: 0,
      reviewsCount: 0,
      subscriptionsCount: 0,
    };
  }
}

function currentSnapshot(): StoreSnapshot {
  try {
    const bookings = getBookings();
    const xpState = getXp();
    const goals = getGoals();
    const reviews = getReviews();
    const subscriptions = getSubscriptions();
    return {
      bookingsCount: bookings.length,
      xpTotal: xpState.total,
      xpLevel: Math.floor(xpState.total / 100),
      goalsCount: goals.length,
      reviewsCount: reviews.length,
      subscriptionsCount: subscriptions.length,
    };
  } catch {
    return {
      bookingsCount: 0,
      xpTotal: 0,
      xpLevel: 0,
      goalsCount: 0,
      reviewsCount: 0,
      subscriptionsCount: 0,
    };
  }
}

export function resetStoreInit(): void {
  initialised = false;
}
