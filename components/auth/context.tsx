"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import type { AuthEcho, AuthMode } from "@/components/auth/types";
import {
  buildCalibration,
  parseRecordInput,
  priceHintForTier,
  type SkillTier,
  type WarriorCalibration,
} from "@/lib/calibration";
import { saveCalibration } from "@/lib/calibration-store";

/**
 * Provisioning itself is NOT called from here any more — both
 * `signInWithPassword` and `signUp` (with an immediate session) fire a
 * Supabase SIGNED_IN event on the same client singleton that
 * `hooks/use-warrior-auth.ts` listens to, and that's now the single place
 * that calls `/api/auth/provision`. Calling it here too would just be a
 * redundant duplicate request (the route is idempotent, but no reason to
 * double the network calls).
 */

function calibrationToMetadata(calibration: WarriorCalibration) {
  return {
    skillTier: calibration.skillTier,
    record: calibration.record,
    startingElo: calibration.startingElo,
    verified: calibration.verifiedFighter,
  };
}

type CalibrationPreview = WarriorCalibration & { priceHint: string };

type AuthFormContextValue = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  toggleMode: () => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  skillTier: SkillTier;
  setSkillTier: (tier: SkillTier) => void;
  recordInput: string;
  setRecordInput: (value: string) => void;
  calibrationPreview: CalibrationPreview | null;
  busy: boolean;
  echo: AuthEcho | null;
  setEcho: (echo: AuthEcho | null) => void;
  submit: () => Promise<void>;
};

const AuthFormContext = createContext<AuthFormContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [skillTier, setSkillTier] = useState<SkillTier>("amateur");
  const [recordInput, setRecordInput] = useState("0-0");
  const [busy, setBusy] = useState(false);
  const [echo, setEcho] = useState<AuthEcho | null>(null);

  const calibrationPreview = useMemo((): CalibrationPreview | null => {
    if (mode !== "register") return null;
    const record = parseRecordInput(recordInput);
    if (!record) return null;
    const cal = buildCalibration(skillTier, record);
    return { ...cal, priceHint: priceHintForTier(skillTier) };
  }, [mode, skillTier, recordInput]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setEcho(null);
  }, []);

  const submit = useCallback(async () => {
    if (!email || !password) return;
    setBusy(true);
    setEcho(null);

    const client = createWarriorBrowserClient();
    if (!client) {
      setEcho({ tone: "err", text: "Supabase не подключён" });
      setBusy(false);
      return;
    }

    if (mode === "login") {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setEcho({ tone: "err", text: "Неверный email или пароль" });
      }
      // On success, the SIGNED_IN listener in useWarriorAuth() provisions
      // (idempotent — no-op if the profile already exists).
    } else {
      const record = parseRecordInput(recordInput);
      if (!record) {
        setEcho({ tone: "err", text: "Введи рекорд в формате 5-2 или 12-3-1" });
        setBusy(false);
        return;
      }

      const calibration = buildCalibration(skillTier, record);

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            // Durable, not device-bound — the provision route reads this
            // back after verifying the token, works even if confirmation
            // happens on a different device than sign-up.
            calibration: calibrationToMetadata(calibration),
          },
        },
      });
      if (error) {
        setEcho({ tone: "err", text: error.message });
      } else {
        if (data.user) {
          // Fallback only, for pre-existing accounts whose user_metadata
          // doesn't have calibration yet.
          saveCalibration(data.user.id, calibration);
        }
        // SIGNED_IN listener provisions if a session was issued immediately;
        // otherwise it'll happen on first login after email confirmation.
        setEcho(
          !data.session
            ? {
                tone: "ok",
                text: `Проверь email · ELO ${calibration.startingElo} · ✅ подтверждённый боец`,
              }
            : {
                tone: "ok",
                text: `Профиль создан · ELO ${calibration.startingElo}`,
              },
        );
      }
    }

    setBusy(false);
  }, [email, password, fullName, mode, skillTier, recordInput]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
      email,
      setEmail,
      password,
      setPassword,
      fullName,
      setFullName,
      skillTier,
      setSkillTier,
      recordInput,
      setRecordInput,
      calibrationPreview,
      busy,
      echo,
      setEcho,
      submit,
    }),
    [
      mode,
      toggleMode,
      email,
      password,
      fullName,
      skillTier,
      recordInput,
      calibrationPreview,
      busy,
      echo,
      submit,
    ],
  );

  return (
    <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>
  );
}

export function useAuthForm() {
  const ctx = useContext(AuthFormContext);
  if (!ctx) {
    throw new Error("useAuthForm must be used within AuthProvider");
  }
  return ctx;
}
