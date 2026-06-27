"use client";

import type { ReactNode } from "react";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { SearchBar } from "@/components/feed/SearchBar";
import { CategoryTabs } from "@/components/feed/CategoryTabs";
import { MainFeed } from "@/components/feed/MainFeed";
import Player from "@/components/Player";
import type { FeedCategory } from "@/components/feed/types";
import type { Video } from "@/lib/data";

type FeedLayoutProps = {
  category: FeedCategory;
  onCategoryChange: (category: FeedCategory) => void;
  roleAccent: string;
  profileInitials: string;
  onSearch?: (query: string) => void;
  onProfileClick?: () => void;
  activeVideo?: Video | null;
  onCloseVideo?: () => void;
  children: ReactNode;
  bottomNav: ReactNode;
};

export function FeedLayout({
  category,
  onCategoryChange,
  roleAccent,
  profileInitials,
  onSearch,
  onProfileClick,
  activeVideo = null,
  onCloseVideo,
  children,
  bottomNav,
}: FeedLayoutProps) {
  return (
    <>
      <FeedHeader initials={profileInitials} onProfileClick={onProfileClick} />
      {category === "feed" && onSearch ? (
        <SearchBar onSearch={onSearch} />
      ) : null}
      <CategoryTabs active={category} onChange={onCategoryChange} />
      <MainFeed>{children}</MainFeed>
      {activeVideo ? (
        <Player video={activeVideo} onClose={onCloseVideo ?? (() => {})} />
      ) : null}
      {bottomNav}
    </>
  );
}
