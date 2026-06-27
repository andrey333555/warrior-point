"use client";

import type { Video } from "@/lib/data";
import { MediaThumbnail } from "@/components/feed/MediaThumbnail";
import { PlayButton } from "@/components/feed/PlayButton";
import { PlatformBadge } from "@/components/feed/PlatformBadge";
import { DurationBadge } from "@/components/feed/DurationBadge";

type VideoCardProps = {
  video: Video;
  onPlay: (video: Video) => void;
};

export function VideoCard({ video, onPlay }: VideoCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="group animate-[fadeIn_0.5s_ease] transform cursor-pointer rounded-xl outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] focus:ring-2 focus:ring-blue-400/50"
      onClick={() => onPlay(video)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay(video);
        }
      }}
    >
      <MediaThumbnail
        src={video.thumbnail}
        alt={video.title}
        rounded="rounded-xl"
        className="mb-2"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:opacity-100">
          <PlayButton size="sm" />
        </div>
        <div className="absolute left-1.5 top-1.5">
          <PlatformBadge label={video.platform ?? "YouTube"} />
        </div>
        {video.duration ? <DurationBadge duration={video.duration} /> : null}
      </MediaThumbnail>

      <div className="flex gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.avatar}
          alt={video.channel}
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="mb-1 line-clamp-2 text-xs font-medium leading-snug text-white">
            {video.title}
          </p>
          <p className="text-xs text-white/40">{video.channel}</p>
          <p className="text-xs text-white/30">
            {video.views} · {video.category}
          </p>
        </div>
      </div>
    </div>
  );
}
