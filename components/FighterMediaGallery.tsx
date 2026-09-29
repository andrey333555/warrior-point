"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface MediaItem {
  type: "video" | "photo";
  url: string;
  thumbnail: string;
  title?: string;
  duration?: string;
}

interface FighterMediaGalleryProps {
  media?: MediaItem[];
}

const DEFAULT_MEDIA: MediaItem[] = [
  {
    type: "video",
    url: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400",
    title: "KO в 2 раунде",
    duration: "0:45",
  },
  {
    type: "photo",
    url: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1517637633369-e4cc28755e01?w=400",
    title: "После боя",
  },
  {
    type: "video",
    url: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400",
    title: "Тренировка",
    duration: "1:23",
  },
  {
    type: "photo",
    url: "#",
    thumbnail:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400",
    title: "С поясом",
  },
];

export default function FighterMediaGallery({
  media = DEFAULT_MEDIA,
}: FighterMediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (media.length === 0) return null;

  const current = media[currentIndex]!;
  const next = () => setCurrentIndex((prev) => (prev + 1) % media.length);
  const prev = () =>
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

  return (
    <div className="mb-4 w-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
          <ImageIcon size={14} />
          Медиа
        </h3>
        <span className="text-xs text-gray-500">
          {currentIndex + 1} / {media.length}
        </span>
      </div>

      <div className="group relative aspect-video overflow-hidden rounded-2xl bg-gray-900">
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          src={current.thumbnail}
          alt={current.title || "media"}
          className="h-full w-full object-cover"
        />

        {current.type === "video" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 border-white/40 bg-white/20 backdrop-blur-md transition-transform hover:scale-110">
              <Play size={28} className="ml-1 text-white" fill="white" />
            </div>
          </div>
        ) : null}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{current.title}</p>
            {current.duration ? (
              <span className="rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                {current.duration}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={prev}
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
          aria-label="Предыдущее"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={next}
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
          aria-label="Следующее"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {media.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={`
              aspect-square rounded-lg overflow-hidden relative
              ${index === currentIndex ? "ring-2 ring-yellow-400" : "opacity-60 hover:opacity-100"}
              transition-all
            `}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            {item.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Play size={16} className="text-white" fill="white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
