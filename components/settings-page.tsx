"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBackOrHome } from "@/hooks/use-back-or-home";
import {
  THEME_OPTIONS,
  useThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import {
  PROFILE_VISIBILITY,
  type ProfileVisibility,
} from "@/lib/fighter-public";
import { loadLocalPrivacy, saveLocalPrivacy } from "@/lib/privacy-local";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

const VIS_LABELS: Record<ProfileVisibility, string> = {
  public: "Публичный — видно всем",
  limited: "Ограниченный — залы и организаторы",
  private: "Приватный — только донаты по ссылке",
};

export default function SettingsPage() {
  const router = useRouter();
  const goBack = useBackOrHome("/profile");
  const auth = useWarriorAuth();
  const { preference, mode, setPreference } = useThemePreference();

  const profileId =
    auth.status === "authenticated" ? auth.user.id : DEMO_FIGHTER_DB_ID;

  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");
  const [hideWeightClass, setHideWeightClass] = useState(false);
  const [hideClub, setHideClub] = useState(false);
  const [hideBio, setHideBio] = useState(false);
  const [hideRecord, setHideRecord] = useState(false);
  const [slug, setSlug] = useState("kolesnik");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const local = loadLocalPrivacy();
    setBookingEnabled(local.bookingEnabled);
    setVisibility(local.visibility);
    setHideWeightClass(local.hideWeightClass);
    setHideClub(local.hideClub);
    setHideBio(local.hideBio);
    setHideRecord(local.hideRecord);
    if (local.slug) setSlug(local.slug);

    void fetch(
      `/api/profile/privacy?profileId=${encodeURIComponent(profileId)}&actorId=${encodeURIComponent(profileId)}`,
    )
      .then((r) => r.json())
      .then((data: {
        ok?: boolean;
        privacy?: {
          bookingEnabled?: boolean;
          visibility?: ProfileVisibility;
          hideWeightClass?: boolean;
          hideClub?: boolean;
          hideBio?: boolean;
          hideRecord?: boolean;
          slug?: string | null;
        };
      }) => {
        if (!data.ok || !data.privacy) return;
        const p = data.privacy;
        if (typeof p.bookingEnabled === "boolean")
          setBookingEnabled(p.bookingEnabled);
        if (p.visibility) setVisibility(p.visibility);
        if (typeof p.hideWeightClass === "boolean")
          setHideWeightClass(p.hideWeightClass);
        if (typeof p.hideClub === "boolean") setHideClub(p.hideClub);
        if (typeof p.hideBio === "boolean") setHideBio(p.hideBio);
        if (typeof p.hideRecord === "boolean") setHideRecord(p.hideRecord);
        if (p.slug) setSlug(p.slug);
      })
      .catch(() => {
        /* keep local */
      });
  }, [profileId]);

  const persist = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    const payload = {
      bookingEnabled,
      visibility,
      hideWeightClass,
      hideClub,
      hideBio,
      hideRecord,
      slug,
    };
    saveLocalPrivacy({ ...payload, slug });

    try {
      const res = await fetch("/api/profile/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: profileId, profileId, ...payload }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!data.ok) {
        setMsg(data.message ?? "Не удалось сохранить на сервере");
      } else {
        setMsg("Сохранено");
      }
    } catch {
      setMsg("Сохранено локально (сервер недоступен)");
    } finally {
      setSaving(false);
    }
  }, [
    bookingEnabled,
    visibility,
    hideWeightClass,
    hideClub,
    hideBio,
    hideRecord,
    slug,
    profileId,
  ]);

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
          Тема, приватность и публичная ссылка
        </p>
      </header>

      <section className="mb-8">
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
      </section>

      <section className="mb-8">
        <p className="mb-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--wp-muted)]">
          Публичная карточка
        </p>

        <label className="mb-3 block text-xs text-[var(--wp-muted)]">
          Slug ссылки
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="mt-1 w-full rounded-xl border border-[var(--wp-border)] bg-[var(--wp-surface)] px-3 py-2.5 text-sm text-[var(--foreground)]"
            placeholder="kolesnik"
          />
          <span className="mt-1 block text-[11px] text-[var(--wp-muted)]">
            Ссылка: /fighter/{slug || "…"}
          </span>
        </label>

        <Toggle
          label="Бронирование тренировок"
          hint="Выкл — скрыть календарь; донаты остаются"
          on={bookingEnabled}
          onToggle={() => setBookingEnabled((v) => !v)}
        />

        <p className="mb-2 mt-4 text-xs text-[var(--wp-muted)]">Видимость</p>
        <div className="mb-4 space-y-2">
          {PROFILE_VISIBILITY.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className="flex w-full rounded-xl border px-3 py-2.5 text-left text-sm"
              style={{
                borderColor:
                  visibility === v
                    ? "rgba(201,168,76,0.55)"
                    : "var(--wp-border)",
                background:
                  visibility === v
                    ? "rgba(201,168,76,0.12)"
                    : "var(--wp-surface)",
              }}
            >
              {VIS_LABELS[v]}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs text-[var(--wp-muted)]">
          Скрыть поля (минималистичный профиль)
        </p>
        <Toggle
          label="Весовая категория"
          on={hideWeightClass}
          onToggle={() => setHideWeightClass((v) => !v)}
        />
        <Toggle
          label="Клуб"
          on={hideClub}
          onToggle={() => setHideClub((v) => !v)}
        />
        <Toggle
          label="Био"
          on={hideBio}
          onToggle={() => setHideBio((v) => !v)}
        />
        <Toggle
          label="Рекорд"
          on={hideRecord}
          onToggle={() => setHideRecord((v) => !v)}
        />

        <button
          type="button"
          disabled={saving}
          onClick={() => void persist()}
          className="mt-4 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          style={{ background: "#C9A84C", color: "#0A0A0A" }}
        >
          {saving ? "Сохранение…" : "Сохранить приватность"}
        </button>
        {msg ? (
          <p className="mt-2 text-center text-xs text-[var(--wp-muted)]">{msg}</p>
        ) : null}

        <button
          type="button"
          onClick={() => router.push(`/fighter/${slug || "kolesnik"}`)}
          className="mt-3 w-full rounded-xl border border-[var(--wp-border)] py-3 text-sm text-[var(--wp-muted)]"
        >
          Открыть публичную карточку →
        </button>
      </section>

      <button
        type="button"
        onClick={() => router.push("/verify")}
        className="mb-3 w-full rounded-xl border border-[var(--wp-border)] py-3 text-sm text-[var(--wp-muted)]"
      >
        Верификация документов →
      </button>

      <button
        type="button"
        onClick={() => router.push("/?tab=passport")}
        className="w-full rounded-xl border border-[var(--wp-border)] py-3 text-sm text-[var(--wp-muted)]"
      >
        Открыть паспорт →
      </button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-2 flex w-full items-center justify-between rounded-xl border border-[var(--wp-border)] bg-[var(--wp-surface)] px-3.5 py-3 text-left"
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? (
          <p className="text-[11px] text-[var(--wp-muted)]">{hint}</p>
        ) : null}
      </div>
      <span
        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{
          background: on ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)",
          color: on ? "#C9A84C" : "var(--wp-muted)",
        }}
      >
        {on ? "Вкл" : "Выкл"}
      </span>
    </button>
  );
}
