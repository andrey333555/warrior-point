"use client";

import { CATEGORIES, type VideoCategory } from "@/lib/data";

type VideoCategoriesProps = {
  active: VideoCategory;
  onChange: (category: VideoCategory) => void;
};

export function VideoCategories({ active, onChange }: VideoCategoriesProps) {
  return (
    <div className="scrollbar-hide mb-5 overflow-x-auto px-4">
      <div className="flex w-max gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={
              active === cat
                ? "whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                : "whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/60 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            }
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
