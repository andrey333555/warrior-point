"use client";

import { useMemo, useState } from "react";
import { HeroCard } from "@/components/feed/HeroCard";
import { VideoCard } from "@/components/feed/VideoCard";
import { VideoCategories } from "@/components/feed/VideoCategories";
import { VIDEOS, type Video, type VideoCategory } from "@/lib/data";

type FeedStreamProps = {
  searchQuery?: string;
  onPlay: (video: Video) => void;
};

export function FeedStream({ searchQuery = "", onPlay }: FeedStreamProps) {
  const [activeCategory, setActiveCategory] = useState<VideoCategory>("Все");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return VIDEOS.filter((v) => {
      const matchCat = activeCategory === "Все" || v.category === activeCategory;
      const matchSearch =
        !q ||
        v.title.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const [hero, ...grid] = filtered;

  return (
    <div className="animate-[fadeIn_0.5s_ease] pb-4">
      <VideoCategories active={activeCategory} onChange={setActiveCategory} />

      {filtered.length === 0 ? (
        <div className="flex animate-[fadeIn_0.5s_ease] flex-col items-center justify-center px-4 py-20 text-center">
          <p className="mb-2 text-lg text-white/30">Ничего не найдено</p>
          <p className="text-sm text-white/20">
            Попробуй другой запрос или категорию
          </p>
        </div>
      ) : (
        <>
          {hero ? <HeroCard video={hero} onPlay={onPlay} /> : null}

          {grid.length > 0 ? (
            <div className="px-3 sm:px-5">
              <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-xs font-medium uppercase tracking-wider text-white/40">
                Ещё видео
              </p>
              <div className="grid grid-cols-2 gap-3">
                {grid.map((v) => (
                  <VideoCard key={v.id} video={v} onPlay={onPlay} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
