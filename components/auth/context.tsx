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
import { provisionNewWarrior } from "@/lib/supabase/provision-user";
import type { AuthEcho, AuthMode } from "@/components/auth/types";

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
  const [busy, setBusy] = useState(false);
  const [echo, setEcho] = useState<AuthEcho | null>(null);

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
      if (error) setEcho({ tone: "err", text: "Неверный email или пароль" });
    } else {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setEcho({ tone: "err", text: error.message });
      } else {
        if (data.user) {
          const { error: provErr } = await provisionNewWarrior(
            client,
            data.user.id,
            fullName || email.split("@")[0],
          );
          if (provErr) {
            console.warn("[AuthForm] provision warning:", provErr.message);
          }
        }
        if (!data.session) {
          setEcho({
            tone: "ok",
            text: "Проверь email — письмо с подтверждением отправлено",
          });
        }
      }
    }

    setBusy(false);
  }, [email, password, fullName, mode]);

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
