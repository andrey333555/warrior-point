"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";
import {
  escapeCsvCell,
  parseFighterCsv,
  type FighterImportIssue,
  type FighterImportRow,
} from "@/lib/fighter-import";
import { STYLE_LABELS } from "@/lib/fighter-onboarding";

type ExportRow = FighterImportRow & {
  inviteCode: string;
  slug: string;
  status: string;
  url: string;
  sms: string;
  emailSubject: string;
  emailBody: string;
};

const SAMPLE_CSV = `name,city,club,style,weight,height,record
Сергей Романов,Питер,Warrior Point,mma,72,180,27-6-0
Анна Иванова,Краснодар,Кузня,бокс,56,168,8-1-0`;

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminFightersImport() {
  const router = useRouter();
  const auth = useWarriorAuth();
  const actorId =
    auth.status === "authenticated" ? auth.user.id : DEMO_FIGHTER_DB_ID;

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<FighterImportRow[]>([]);
  const [issues, setIssues] = useState<FighterImportIssue[]>([]);
  const [created, setCreated] = useState<ExportRow[]>([]);
  const [skipped, setSkipped] = useState<ExportRow[]>([]);
  const [existing, setExisting] = useState<ExportRow[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminSecret, setAdminSecret] = useState("");

  const adminHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminSecret.trim()) headers["x-warrior-admin-secret"] = adminSecret.trim();
    return headers;
  }, [adminSecret]);

  const loadExisting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/fighters/import?actorId=${encodeURIComponent(actorId)}`,
        { headers: adminHeaders() },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        drafts?: ExportRow[];
        persisted?: string;
      };
      if (!data.ok) {
        setError(data.message ?? "Нет доступа");
        setExisting([]);
      } else {
        setError(null);
        setExisting(data.drafts ?? []);
        if (data.persisted === "memory") {
          setWarning(
            "Черновики в памяти сервера. Примените миграцию 0026 и SUPABASE_SERVICE_ROLE_KEY — иначе коды пропадут после рестарта.",
          );
        }
      }
    } catch {
      setError("Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, [actorId, adminHeaders]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  const previewFromText = (text: string, name: string) => {
    const parsed = parseFighterCsv(text);
    setFileName(name);
    setRows(parsed.rows);
    setIssues(parsed.issues);
    setCreated([]);
    setSkipped([]);
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    previewFromText(text, file.name);
  };

  const importRows = async () => {
    if (!rows.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fighters/import", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ actorId, rows }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        warning?: string;
        created?: ExportRow[];
        skipped?: ExportRow[];
      };
      if (!data.ok) {
        setError(data.message ?? "Импорт не прошёл");
        return;
      }
      setCreated(data.created ?? []);
      setSkipped(data.skipped ?? []);
      setWarning(data.warning ?? null);
      setExisting((prev) => {
        const next = [...(data.created ?? []), ...prev];
        const seen = new Set<string>();
        return next.filter((r) => {
          if (seen.has(r.inviteCode)) return false;
          seen.add(r.inviteCode);
          return true;
        });
      });
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  const resultRows = created.length || skipped.length ? [...created, ...skipped] : existing;

  const exportOutreach = () => {
    const header = [
      "name",
      "invite_code",
      "url",
      "sms",
      "email_subject",
      "email_body",
    ].join(",");
    const body = resultRows
      .map((r) =>
        [r.name, r.inviteCode, r.url, r.sms, r.emailSubject, r.emailBody]
          .map((cell) => escapeCsvCell(cell ?? ""))
          .join(","),
      )
      .join("\n");
    downloadText(`fighter-invites-${Date.now()}.csv`, `${header}\n${body}\n`, "text/csv;charset=utf-8");
  };

  const copyLinks = async () => {
    const text = resultRows.map((r) => `${r.name}\t${r.url}`).join("\n");
    await navigator.clipboard.writeText(text);
  };

  const styleLabel = (id: string) => STYLE_LABELS[id] ?? id.toUpperCase();

  const readyCount = useMemo(() => rows.length, [rows.length]);

  return (
    <div
      className="mx-auto min-h-screen max-w-3xl overflow-x-hidden px-4 pb-24 pt-4"
      style={{ background: "#0A0A0A", color: "#fff" }}
    >
      <header className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-2 rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50"
        >
          ← Админка
        </button>
        <h1 className="text-2xl font-bold">Импорт бойцов</h1>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          CSV → превью → черновики паспортов и уникальные ссылки{" "}
          <span className="text-[#C9A84C]">/invite/КОД</span>. SMS и почта сами
          не уходят — скачайте файл для рассылки.
        </p>
        <input
          type="password"
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          onBlur={() => void loadExisting()}
          placeholder="Секрет админа, если нет сессии"
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/25"
          autoComplete="off"
        />
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {warning ? (
        <div className="mb-4 rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 p-4 text-sm text-[#C9A84C]">
          {warning}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
          1. Файл
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 px-4 py-8 text-center">
          <span className="text-sm text-white/70">
            {fileName ?? "Нажми и выбери CSV"}
          </span>
          <span className="mt-1 text-[11px] text-white/35">
            Колонки: name, city, club, style, weight, height, record
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => previewFromText(SAMPLE_CSV, "пример.csv")}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70"
          >
            Пример CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText("fighters-template.csv", SAMPLE_CSV, "text/csv;charset=utf-8")
            }
            className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70"
          >
            Скачать шаблон
          </button>
        </div>
      </section>

      {rows.length || issues.length ? (
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
              2. Превью · {readyCount} строк
            </p>
            <button
              type="button"
              disabled={busy || !rows.length}
              onClick={() => void importRows()}
              className="rounded-xl bg-[#C9A84C] px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              {busy ? "Импорт…" : "Создать паспорта"}
            </button>
          </div>
          {issues.length ? (
            <ul className="mb-3 space-y-1 text-[11px] text-red-300/80">
              {issues.map((issue) => (
                <li key={`${issue.line}-${issue.message}`}>
                  Строка {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[640px] text-left text-[11px]">
              <thead className="text-white/40">
                <tr>
                  <th className="pb-2 pr-2">Имя</th>
                  <th className="pb-2 pr-2">Город</th>
                  <th className="pb-2 pr-2">Клуб</th>
                  <th className="pb-2 pr-2">Стиль</th>
                  <th className="pb-2 pr-2">Вес</th>
                  <th className="pb-2 pr-2">Рост</th>
                  <th className="pb-2">Рекорд</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.name}-${i}`} className="border-t border-white/8">
                    <td className="py-2 pr-2 font-medium">{row.name}</td>
                    <td className="py-2 pr-2 text-white/60">{row.city || "—"}</td>
                    <td className="py-2 pr-2 text-white/60">{row.club || "—"}</td>
                    <td className="py-2 pr-2 text-white/60">{styleLabel(row.style)}</td>
                    <td className="py-2 pr-2 text-white/60">{row.weight ?? "—"}</td>
                    <td className="py-2 pr-2 text-white/60">{row.height ?? "—"}</td>
                    <td className="py-2 text-white/60">{row.record ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
            3. Ссылки для рассылки
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!resultRows.length}
              onClick={() => void copyLinks()}
              className="rounded-xl border border-white/15 px-3 py-2 text-xs disabled:opacity-40"
            >
              Копировать
            </button>
            <button
              type="button"
              disabled={!resultRows.length}
              onClick={exportOutreach}
              className="rounded-xl bg-[#C9A84C] px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              Экспорт ссылок
            </button>
          </div>
        </div>
        {created.length ? (
          <p className="mb-2 text-xs text-white/55">
            Создано: {created.length}
            {skipped.length ? ` · уже были: ${skipped.length}` : ""}
          </p>
        ) : null}
        {loading && !resultRows.length ? (
          <p className="text-sm text-white/40">Загрузка…</p>
        ) : !resultRows.length ? (
          <p className="text-sm text-white/40">Пока пусто — загрузите CSV.</p>
        ) : (
          <ul className="space-y-2">
            {resultRows.map((row) => (
              <li
                key={row.inviteCode}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.name}</p>
                    <p className="truncate text-[11px] text-[#C9A84C]">{row.url}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                      {row.status} · {row.inviteCode}
                    </p>
                  </div>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[10px] uppercase tracking-wider text-white/50"
                  >
                    Открыть
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
