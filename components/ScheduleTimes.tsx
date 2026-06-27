"use client";

import { useState } from "react";
import { scheduleTimes } from "@/lib/data";

export default function ScheduleTimes() {
  const [active, setActive] = useState(scheduleTimes[0]?.id ?? "10-00");

  return (
    <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
      {scheduleTimes.map((t) => {
        const selected = t.id === active;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={[
              "shrink-0 text-sm font-medium transition-colors",
              selected ? "text-white" : "text-gray-500 hover:text-gray-300",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
