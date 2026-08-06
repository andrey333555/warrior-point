"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { ROLE_LABELS, type WarriorRole } from "@/lib/roles";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

type Row = {
  id: string;
  displayName: string | null;
  role: WarriorRole;
  slug: string | null;
  visibility: string;
  verificationStatus: string;
};

export default function AdminPage() {
  const router = useRouter();
  const auth = useWarriorAuth();
  const actorId =
    auth.status === "authenticated" ? auth.user.id : DEMO_FIGHTER_DB_ID;

  const [rows, setRows] = useState<Row[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/profiles?actorId=${encodeURIComponent(actorId)}&admin=1`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        canDelete?: boolean;
        profiles?: Row[];
      };
      if (!data.ok) {
        setError(data.message ?? "Нет доступа");
        setRows([]);
      } else {
        setRows(data.profiles ?? []);
        setCanDelete(!!data.canDelete);
      }
    } catch {
      setError("Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    const header = "id,displayName,role,slug,visibility,verification\n";
    const body = rows
      .map((r) =>
        [
          r.id,
          JSON.stringify(r.displayName ?? ""),
          r.role,
          r.slug ?? "",
          r.visibility,
          r.verificationStatus,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warrior-profiles-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const softDelete = async (profileId: string) => {
    if (!canDelete) return;
    if (!confirm("Пометить профиль как Deleted? (soft-delete stub)")) return;
    const res = await fetch("/api/admin/profiles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId, profileId, confirm: true }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    alert(data.message ?? (data.ok ? "Готово" : "Ошибка"));
    void load();
  };

  return (
    <div
      className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-4"
      style={{ background: "#0A0A0A", color: "#fff" }}
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-2 rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50"
          >
            ← Назад
          </button>
          <h1 className="text-2xl font-bold">Админ · каркас</h1>
          <p className="text-xs text-white/40">
            Просмотр / экспорт. Coach — read-only. Стримы — backlog.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl border border-white/20 px-3 py-2 text-xs"
          >
            Экспорт CSV
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/streams")}
            className="rounded-xl border border-[#C9A84C]/40 px-3 py-2 text-xs text-[#C9A84C]"
          >
            Стримы (скоро)
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-white/40">Загрузка…</p>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p>{error}</p>
          <p className="mt-2 text-xs text-white/40">
            Подсказка: откройте{" "}
            <code className="text-[#C9A84C]">/admin?admin=1</code> или роль
            admin/coach в профиле.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {r.displayName ?? r.id}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {ROLE_LABELS[r.role]} · {r.visibility} ·{" "}
                    {r.verificationStatus}
                    {r.slug ? ` · /fighter/${r.slug}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.slug ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/fighter/${r.slug}`)}
                      className="text-[10px] uppercase tracking-wider text-[#C9A84C]"
                    >
                      Карточка
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void softDelete(r.id)}
                      className="text-[10px] uppercase tracking-wider text-red-400/80"
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
