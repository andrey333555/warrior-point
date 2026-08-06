"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

export default function VerifyPage() {
  const router = useRouter();
  const auth = useWarriorAuth();
  const profileId =
    auth.status === "authenticated" ? auth.user.id : DEMO_FIGHTER_DB_ID;

  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!fileName) {
      setMsg("Выберите файл документа");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, fileName }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setMsg(data.message ?? (data.ok ? "Отправлено" : "Ошибка"));
    } catch {
      setMsg("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-4"
      style={{ background: "#0A0A0A", color: "#fff" }}
    >
      <button
        type="button"
        onClick={() => router.push("/settings")}
        className="mb-4 rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-wider text-white/50"
      >
        ← Настройки
      </button>
      <h1 className="mb-2 text-2xl font-bold">Верификация</h1>
      <p className="mb-6 text-sm text-white/50">
        AI-проверка документов — stub. Файл не загружается на сервер; статус
        профиля ставится в <code className="text-[#C9A84C]">pending</code>.
      </p>

      <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-10">
        <span className="mb-2 text-3xl">📄</span>
        <span className="text-sm text-white/70">
          {fileName ?? "Выбрать паспорт / удостоверение"}
        </span>
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        style={{ background: "#C9A84C", color: "#0A0A0A" }}
      >
        {busy ? "Отправка…" : "Отправить на проверку"}
      </button>
      {msg ? (
        <p className="mt-3 text-center text-xs text-white/50">{msg}</p>
      ) : null}
    </div>
  );
}
