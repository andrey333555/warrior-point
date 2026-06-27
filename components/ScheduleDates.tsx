"use client";

import { useState } from "react";
import { scheduleDates } from "@/lib/data";

export default function ScheduleDates() {
  const [active, setActive] = useState(scheduleDates[0]?.id ?? "today");

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
      {scheduleDates.map((d) => {
        const selected = d.id === active;

        return (
          <button
            key={d.id}
            type="button"
            onClick={() => setActive(d.id)}
            className={[
              "shrink-0 text-sm font-medium transition-colors",
              selected ? "text-white" : "text-gray-500 hover:text-gray-300",
            ].join(" ")}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}
