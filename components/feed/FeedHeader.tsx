"use client";

function HexLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden>
      <polygon
        points="14,2 26,8 26,20 14,26 2,20 2,8"
        stroke="#C9A84C"
        strokeWidth="1.5"
        fill="none"
      />
      <polygon
        points="14,7 21,11 21,17 14,21 7,17 7,11"
        stroke="#C9A84C"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

type FeedHeaderProps = {
  initials: string;
  title?: string;
  onProfileClick?: () => void;
  onNotificationsClick?: () => void;
};

export function FeedHeader({
  initials,
  title = "ROUND 23",
  onProfileClick,
  onNotificationsClick,
}: FeedHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        <HexLogo />
        <span className="truncate text-sm font-medium tracking-widest text-white">
          {title}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label="Уведомления"
          className="rounded-full text-white/50 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          <BellIcon />
        </button>
        <button
          type="button"
          onClick={onProfileClick}
          aria-label="Профиль"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-medium text-black transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
