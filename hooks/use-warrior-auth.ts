"use client";

import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session; devBypass?: true };

// ── Dev bypass ────────────────────────────────────────────────────────────────

export const DEV_BYPASS_KEY = "wp_dev_bypass";

/** Activate dev bypass: stores flag + triggers storage event for same-tab sync. */
export function activateDevBypass(): void {
  try {
    localStorage.setItem(DEV_BYPASS_KEY, "1");
    // Dispatch a custom event so useWarriorAuth reacts without a full reload
    window.dispatchEvent(new CustomEvent("wp:dev-bypass"));
  } catch {
    // localStorage unavailable — just reload
    location.reload();
  }
}

/** Deactivate dev bypass and reload. */
export function deactivateDevBypass(): void {
  try {
    localStorage.removeItem(DEV_BYPASS_KEY);
    window.dispatchEvent(new CustomEvent("wp:dev-bypass-off"));
  } catch {
    location.reload();
  }
}

export function isDevBypassActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEV_BYPASS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Synthetic User object that stands in for the demo fighter in bypass mode. */
function makeDemoUser(): User {
  return {
    id: DEMO_FIGHTER_DB_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "viktor@warrior.point",
    created_at: "2024-01-01T00:00:00.000Z",
    app_metadata: {},
    user_metadata: { full_name: "Боец Бойцов" },
  } as unknown as User;
}

function makeDemoSession(user: User): Session {
  return {
    access_token: "dev-bypass-token",
    refresh_token: "dev-bypass-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user,
  } as unknown as Session;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWarriorAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => {
    // Immediate bypass check — skip the "loading" flash if flag is already set
    if (isDevBypassActive()) {
      const user = makeDemoUser();
      return { status: "authenticated", user, session: makeDemoSession(user), devBypass: true };
    }
    return { status: "loading" };
  });

  useEffect(() => {
    // ── Handle dev bypass events (same tab) ─────────────────────────────────
    function onBypassOn() {
      const user = makeDemoUser();
      setState({
        status: "authenticated",
        user,
        session: makeDemoSession(user),
        devBypass: true,
      });
    }
    function onBypassOff() {
      setState({ status: "loading" });
      // Re-run real auth flow after clearing
      void initRealAuth();
    }

    window.addEventListener("wp:dev-bypass", onBypassOn);
    window.addEventListener("wp:dev-bypass-off", onBypassOff);

    // If already in bypass, nothing more to do
    if (isDevBypassActive()) {
      return () => {
        window.removeEventListener("wp:dev-bypass", onBypassOn);
        window.removeEventListener("wp:dev-bypass-off", onBypassOff);
      };
    }

    // ── Normal Supabase auth flow ────────────────────────────────────────────
    let unsubscribe: (() => void) | null = null;

    async function initRealAuth() {
      const client = createWarriorBrowserClient();
      if (!client) {
        setState({ status: "unauthenticated" });
        return;
      }

      const { data } = await client.auth.getSession();
      if (isDevBypassActive()) return; // bypass was activated while awaiting

      if (data.session?.user) {
        setState({
          status: "authenticated",
          user: data.session.user,
          session: data.session,
        });
      } else {
        setState({ status: "unauthenticated" });
      }

      const { data: listener } = client.auth.onAuthStateChange(
        (_event, session) => {
          if (isDevBypassActive()) return;
          if (session?.user) {
            setState({
              status: "authenticated",
              user: session.user,
              session,
            });
          } else {
            setState({ status: "unauthenticated" });
          }
        },
      );

      unsubscribe = () => listener.subscription.unsubscribe();
    }

    void initRealAuth();

    return () => {
      unsubscribe?.();
      window.removeEventListener("wp:dev-bypass", onBypassOn);
      window.removeEventListener("wp:dev-bypass-off", onBypassOff);
    };
  }, []);

  return state;
}

export async function signOutWarrior() {
  // Clear dev bypass on sign-out so we don't get stuck
  deactivateDevBypass();
  const client = createWarriorBrowserClient();
  if (!client) return;
  await client.auth.signOut();
}
