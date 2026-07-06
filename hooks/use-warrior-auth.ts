"use client";

import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import type { Session as NextAuthSession } from "next-auth";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      user: User;
      session: Session;
      devBypass?: true;
      oauth?: true;
    };

type SupabaseAuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session };

// ── Dev bypass ────────────────────────────────────────────────────────────────

export const DEV_BYPASS_KEY = "wp_dev_bypass";

/** Activate dev bypass: stores flag + triggers storage event for same-tab sync. */
export function activateDevBypass(): void {
  try {
    localStorage.setItem(DEV_BYPASS_KEY, "1");
    window.dispatchEvent(new CustomEvent("wp:dev-bypass"));
  } catch {
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

function makeSyntheticSession(user: User): Session {
  return {
    access_token: "synthetic-token",
    refresh_token: "synthetic-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user,
  } as unknown as Session;
}

function oauthSessionToAuthState(oauthSession: NextAuthSession): AuthState {
  const oauthUser = oauthSession.user;
  const userId = oauthUser.id ?? oauthUser.email ?? "oauth-user";
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: oauthUser.email ?? undefined,
    created_at: new Date().toISOString(),
    app_metadata: { provider: "next-auth" },
    user_metadata: { full_name: oauthUser.name ?? oauthUser.email ?? "Воин" },
  } as unknown as User;

  return {
    status: "authenticated",
    user,
    session: makeSyntheticSession(user),
    oauth: true,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWarriorAuth(): AuthState {
  const { data: oauthSession, status: oauthStatus } = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [supabaseAuth, setSupabaseAuth] = useState<SupabaseAuthState>({
    status: "loading",
  });

  useEffect(() => {
    setDevBypass(isDevBypassActive());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onBypassOn() {
      setDevBypass(true);
    }
    function onBypassOff() {
      setDevBypass(false);
      setSupabaseAuth({ status: "loading" });
    }

    window.addEventListener("wp:dev-bypass", onBypassOn);
    window.addEventListener("wp:dev-bypass-off", onBypassOff);

    if (devBypass) {
      return () => {
        window.removeEventListener("wp:dev-bypass", onBypassOn);
        window.removeEventListener("wp:dev-bypass-off", onBypassOff);
      };
    }

    let unsubscribe: (() => void) | null = null;

    async function initSupabaseAuth() {
      const client = createWarriorBrowserClient();
      if (!client) {
        setSupabaseAuth({ status: "unauthenticated" });
        return;
      }

      const { data } = await client.auth.getSession();
      if (isDevBypassActive()) return;

      if (data.session?.user) {
        setSupabaseAuth({
          status: "authenticated",
          user: data.session.user,
          session: data.session,
        });
      } else {
        setSupabaseAuth({ status: "unauthenticated" });
      }

      const { data: listener } = client.auth.onAuthStateChange(
        (_event, session) => {
          if (isDevBypassActive()) return;
          if (session?.user) {
            setSupabaseAuth({
              status: "authenticated",
              user: session.user,
              session,
            });
          } else {
            setSupabaseAuth({ status: "unauthenticated" });
          }
        },
      );

      unsubscribe = () => listener.subscription.unsubscribe();
    }

    void initSupabaseAuth();

    return () => {
      unsubscribe?.();
      window.removeEventListener("wp:dev-bypass", onBypassOn);
      window.removeEventListener("wp:dev-bypass-off", onBypassOff);
    };
  }, [devBypass]);

  if (!hydrated) {
    return { status: "loading" };
  }

  if (devBypass) {
    const user = makeDemoUser();
    return {
      status: "authenticated",
      user,
      session: makeSyntheticSession(user),
      devBypass: true,
    };
  }

  if (oauthStatus === "loading" || supabaseAuth.status === "loading") {
    return { status: "loading" };
  }

  if (oauthSession?.user) {
    return oauthSessionToAuthState(oauthSession);
  }

  return supabaseAuth;
}

export async function signOutWarrior() {
  deactivateDevBypass();
  await nextAuthSignOut({ redirect: false });
  const client = createWarriorBrowserClient();
  if (!client) return;
  await client.auth.signOut();
}
