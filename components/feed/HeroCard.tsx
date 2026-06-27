"use client";

import type { Video } from "@/lib/data";
import { MediaThumbnail } from "@/components/feed/MediaThumbnail";
import { PlayButton } from "@/components/feed/PlayButton";
import { PlatformBadge } from "@/components/feed/PlatformBadge";
import { DurationBadge } from "@/components/feed/DurationBadge";

type HeroCardProps = {
  video: Video;
  onPlay: (video: Video) => void;
};

export function HeroCard({ video, onPlay }: HeroCardProps) {
  return (
    <div className="mb-4 animate-[fadeIn_0.5s_ease] px-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onPlay(video)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlay(video);
          }
        }}
        className="transform cursor-pointer rounded-2xl outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] focus:ring-2 focus:ring-blue-400/50"
      >
        <MediaThumbnail
          src={video.thumbnail}
          alt={video.title}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayButton />
          </div>

          {video.duration ? <DurationBadge duration={video.duration} /> : null}

          <div
            className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: "rgba(201,168,76,0.9)", color: "#0A0A0A" }}
          >
            {video.category}
          </div>

          <div className="absolute left-3 top-12">
            <PlatformBadge label={video.platform ?? "YouTube"} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="mb-2 line-clamp-2 text-base font-medium leading-snug text-white">
              {video.title}
            </h2>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.avatar}
                alt={video.channel}
                className="h-5 w-5 rounded-full"
              />
              <span className="text-xs text-white/70">{video.channel}</span>
              {video.verified ? (
                <svg width="12" height="12" fill="#C9A84C" viewBox="0 0 24 24" aria-hidden>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : null}
              <span className="ml-auto text-xs text-white/40">{video.views} просмотров</span>
            </div>
          </div>
        </MediaThumbnail>
      </div>
    </div>
  );
}
