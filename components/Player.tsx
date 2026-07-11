"use client";

import { useRef, useState } from "react";
import type { Video } from "@/lib/data";

type PlayerProps = {
  video: Video | null;
  onClose: () => void;
};

export default function Player({ video, onClose }: PlayerProps) {
  const [mini, setMini] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!video) return null;

  if (mini) {
    return (
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[120] mx-auto flex max-w-[388px] items-center justify-between rounded-xl border border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-out">
        <button
          type="button"
          onClick={() => setMini(false)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              src={video.videoUrl}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          </div>
          <span className="truncate text-sm font-medium text-white">{video.title}</span>
        </button>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMini(false)}
            aria-label="Развернуть"
            className="text-white/70 transition-colors hover:text-white"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4-5 5M4 16v4m0 0h4m-4 0 5-5m11 5-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-white/70 transition-colors hover:text-white"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="text-white/60 transition-colors hover:text-white"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="max-w-[60%] truncate text-center text-sm font-medium text-white">
          {video.title}
        </span>
        <button
          type="button"
          onClick={() => setMini(true)}
          className="text-white/60 transition-colors hover:text-white"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={video.videoUrl}
          autoPlay
          controls
          className="max-h-full w-full"
          style={{ maxHeight: "50vh" }}
        />
      </div>

      <div className="shrink-0 px-4 py-4" style={{ background: "#0A0A0A" }}>
        <h3 className="mb-3 text-base font-medium leading-snug text-white">{video.title}</h3>
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.avatar} alt={video.channel} className="h-8 w-8 rounded-full" />
          <div>
            <p className="text-sm font-medium text-white">{video.channel}</p>
            <p className="text-xs text-white/40">{video.views} просмотров</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ background: "#C9A84C", color: "#0A0A0A" }}
          >
            Подписаться
          </button>
        </div>

        <div className="flex items-center gap-6">
          {[
            {
              icon: "M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z",
              label: "Лайк",
            },
            {
              icon: "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z",
              label: "Поделиться",
            },
            {
              icon: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z",
              label: "Сохранить",
            },
          ].map(({ icon, label }) => (
            <button
              key={label}
              type="button"
              className="flex flex-col items-center gap-1 text-white/50 transition-colors hover:text-white"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
