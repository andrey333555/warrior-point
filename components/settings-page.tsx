"use client";

import { useRouter } from "next/navigation";
import { useBackOrHome } from "@/hooks/use-back-or-home";
import {
  THEME_OPTIONS,
  useThemePreference,
  type ThemePreference,
} from "@/lib/theme";

export default function SettingsPage() {
  const router = useRouter();
  const goBack = useBackOrHome("/profile");
  const { preference, mode, setPreference } = useThemePreference();

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-[var(--background)] px-4 pb-24 pt-4 text-[var(--foreground)]">
      <header className="mb-6">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full border border-[var(--wp-border)] bg-[var(--wp-surface)] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[var(--wp-muted)]"
        >
          ← Назад
        </button>
        <h1 className="mt-4 text-2xl font-bold">Настройки</h1>
        <p className="mt-1 text-sm text-[var(--wp-muted)]">
          Тема приложения и постеров для друзей
        </p>
      </header>

      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--wp-muted)]">
          Тема
        </p>
        <div className="space-y-2">
          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreference(opt.id as ThemePreference)}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99]"
                style={{
                  borderColor: active
                    ? "rgba(201,168,76,0.55)"
                    : "var(--wp-border)",
                  background: active
                    ? "rgba(201,168,76,0.12)"
                    : "var(--wp-surface)",
                }}
              >
                <span className="text-xl">{opt.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-[var(--wp-muted)]">{opt.hint}</p>
                </div>
                {active ? (
                  <span className="text-xs font-medium text-[#C9A84C]">✓</span>
                ) : null}
              </button>
            );
          })}
        </div>
        {preference === "auto" ? (
          <p className="mt-3 text-xs text-[var(--wp-muted)]">
            Сейчас: {mode === "light" ? "светлая" : "тёмная"} (по времени суток)
          </p>
        ) : null}

        <div
          className="mt-4 overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--wp-border)" }}
        >
          <div
            className="px-4 py-6 text-center text-sm font-medium"
            style={{ background: "var(--background)", color: "var(--foreground)" }}
          >
            Фон приложения · {mode === "dark" ? "тёмный" : mode === "light" ? "белый" : "гибрид"}
          </div>
          <div
            className="px-4 py-3 text-center text-xs"
            style={{ background: "var(--wp-surface)", color: "var(--wp-muted)" }}
          >
            Карточки и панели
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => router.push("/?tab=passport")}
        className="mt-8 w-full rounded-xl border border-[var(--wp-border)] py-3 text-sm text-[var(--wp-muted)]"
      >
        Открыть паспорт →
      </button>
    </div>
  );
}
