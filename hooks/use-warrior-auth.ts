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
      /** Demo / guest passport — no OAuth required. */
      guestMode?: true;
      /** @deprecated use guestMode */
      devBypass?: true;
      oauth?: true;
    };

type SupabaseAuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session };

// ── Guest / demo mode (production-safe) ───────────────────────────────────────

export const GUEST_MODE_KEY = "wp_guest_mode";
/** @deprecated — kept for back-compat with older builds */
export const DEV_BYPASS_KEY = "wp_dev_bypass";

const OAUTH_LOADING_CAP_MS = 2800;
const SUPABASE_LOADING_CAP_MS = 2500;

export function isGuestModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(GUEST_MODE_KEY) === "1" ||
      localStorage.getItem(DEV_BYPASS_KEY) === "1"
    );
  } catch {
    return false;
  }
}

/** Sync: ?guest=1 / localStorage — avoids stuck «Загрузка…» before effects run. */
function readGuestIntentFromClient(): boolean {
  if (typeof window === "undefined") return false;
  if (isGuestModeActive()) return true;
  try {
    const sp = new URLSearchParams(window.location.search);
    const want =
      sp.get("guest") === "1" ||
      sp.get("demo") === "1" ||
      sp.get("preview") === "1";
    if (!want) return false;
    localStorage.setItem(GUEST_MODE_KEY, "1");
    localStorage.setItem(DEV_BYPASS_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/** Enter demo passport without login — works on production. */
export function activateGuestMode(): void {
  try {
    localStorage.setItem(GUEST_MODE_KEY, "1");
    localStorage.setItem(DEV_BYPASS_KEY, "1");
    window.dispatchEvent(new CustomEvent("wp:guest-mode"));
  } catch {
    location.reload();
  }
}

export function deactivateGuestMode(): void {
  try {
    localStorage.removeItem(GUEST_MODE_KEY);
    localStorage.removeItem(DEV_BYPASS_KEY);
    window.dispatchEvent(new CustomEvent("wp:guest-mode-off"));
  } catch {
    location.reload();
  }
}

/** @deprecated use activateGuestMode */
export const activateDevBypass = activateGuestMode;
/** @deprecated use deactivateGuestMode */
export const deactivateDevBypass = deactivateGuestMode;
/** @deprecated use isGuestModeActive */
export const isDevBypassActive = isGuestModeActive;

function makeDemoUser(): User {
  return {
    id: DEMO_FIGHTER_DB_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "king@warrior.point",
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

function guestAuthState(): AuthState {
  const user = makeDemoUser();
  return {
    status: "authenticated",
    user,
    session: makeSyntheticSession(user),
    guestMode: true,
    devBypass: true,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWarriorAuth(): AuthState {
  const { data: oauthSession, status: oauthStatus } = useSession();
  // Client sync init: guest URL/localStorage must not wait on effects (infinite spinner).
  const [guestMode, setGuestMode] = useState(readGuestIntentFromClient);
  // Стартуем с false и на сервере, и в браузере: разный первый кадр ломает
  // гидратацию, а React в ответ перерисовывает всё дерево заново.
  const [hydrated, setHydrated] = useState(false);
  const [oauthTimedOut, setOauthTimedOut] = useState(false);
  const [supabaseAuth, setSupabaseAuth] = useState<SupabaseAuthState>(() =>
    readGuestIntentFromClient()
      ? { status: "unauthenticated" }
      : { status: "loading" },
  );

  useEffect(() => {
    const active = readGuestIntentFromClient();
    setGuestMode(active);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (oauthStatus !== "loading") {
      setOauthTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setOauthTimedOut(true), OAUTH_LOADING_CAP_MS);
    return () => window.clearTimeout(id);
  }, [oauthStatus]);

  useEffect(() => {
    function onGuestOn() {
      setGuestMode(true);
    }
    function onGuestOff() {
      setGuestMode(false);
      setSupabaseAuth({ status: "loading" });
    }

    window.addEventListener("wp:guest-mode", onGuestOn);
    window.addEventListener("wp:guest-mode-off", onGuestOff);
    window.addEventListener("wp:dev-bypass", onGuestOn);
    window.addEventListener("wp:dev-bypass-off", onGuestOff);

    if (guestMode) {
      return () => {
        window.removeEventListener("wp:guest-mode", onGuestOn);
        window.removeEventListener("wp:guest-mode-off", onGuestOff);
        window.removeEventListener("wp:dev-bypass", onGuestOn);
        window.removeEventListener("wp:dev-bypass-off", onGuestOff);
      };
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const capId = window.setTimeout(() => {
      if (!cancelled) {
        setSupabaseAuth((prev) =>
          prev.status === "loading" ? { status: "unauthenticated" } : prev,
        );
      }
    }, SUPABASE_LOADING_CAP_MS);

    async function initSupabaseAuth() {
      const client = createWarriorBrowserClient();
      if (!client) {
        if (!cancelled) setSupabaseAuth({ status: "unauthenticated" });
        return;
      }

      try {
        const { data } = await client.auth.getSession();
        if (cancelled) return;

        // Guest flag may appear mid-flight (share link). Never leave auth stuck on loading.
        if (isGuestModeActive()) {
          setGuestMode(true);
          return;
        }

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
            if (isGuestModeActive()) return;
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
      } catch {
        if (!cancelled) setSupabaseAuth({ status: "unauthenticated" });
      }
    }

    void initSupabaseAuth();

    return () => {
      cancelled = true;
      window.clearTimeout(capId);
      unsubscribe?.();
      window.removeEventListener("wp:guest-mode", onGuestOn);
      window.removeEventListener("wp:guest-mode-off", onGuestOff);
      window.removeEventListener("wp:dev-bypass", onGuestOn);
      window.removeEventListener("wp:dev-bypass-off", onGuestOff);
    };
  }, [guestMode]);

  if (!hydrated) {
    return { status: "loading" };
  }

  if (guestMode) {
    return guestAuthState();
  }

  const oauthStillLoading = oauthStatus === "loading" && !oauthTimedOut;
  const supabaseStillLoading = supabaseAuth.status === "loading";

  if (oauthStillLoading || supabaseStillLoading) {
    return { status: "loading" };
  }

  if (oauthSession?.user) {
    return oauthSessionToAuthState(oauthSession);
  }

  return supabaseAuth;
}

export async function signOutWarrior() {
  deactivateGuestMode();
  await nextAuthSignOut({ redirect: false });
  const client = createWarriorBrowserClient();
  if (!client) return;
  await client.auth.signOut();
}

/** Share link for WhatsApp / family — one tap into demo passport. */
export const GUEST_SHARE_PATH = "/?guest=1";
