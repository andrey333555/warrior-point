"use client";

import dynamic from "next/dynamic";

const CyberMap = dynamic(() => import("@/components/cyber-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950">
      <p className="animate-pulse font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.36em] text-cyan-400/70">
        Загружаю карту сети…
      </p>
    </div>
  ),
});

export default function CyberMapLoader({
  clientId,
  onBooked,
}: {
  clientId?: string;
  onBooked?: (msg: string) => void;
}) {
  return <CyberMap clientId={clientId} onBooked={onBooked} />;
}
