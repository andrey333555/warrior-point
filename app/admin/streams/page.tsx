import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Стримы · Backlog · Warrior Point",
};

/** Backlog stub — streaming API integration (TZ §5). */
export default function StreamsBacklogPage() {
  return (
    <div
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6"
      style={{ background: "#0A0A0A", color: "#fff" }}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
        Backlog
      </p>
      <h1 className="mb-3 text-2xl font-bold">Прямые трансляции</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/55">
        Интеграция стримингового API для онлайн-эфиров тренировок и соревнований
        запланирована в следующих обновлениях. Сейчас — заглушка без API.
      </p>
      <ul className="mb-8 list-inside list-disc space-y-1 text-sm text-white/40">
        <li>Выбор провайдера (IVS / Agora / VK Live)</li>
        <li>Права доступа зал / боец / зритель</li>
        <li>Донаты во время эфира</li>
      </ul>
      <Link href="/admin" className="text-sm text-[#C9A84C]">
        ← В админку
      </Link>
    </div>
  );
}
