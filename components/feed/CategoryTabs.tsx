"use client";

import { CyberTabs } from "@/components/cyber-tabs";
import { FEED_CATEGORIES, type FeedCategory } from "@/components/feed/types";

type CategoryTabsProps = {
  active: FeedCategory;
  onChange: (id: FeedCategory) => void;
};

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  return (
    <div className="relative z-20 shrink-0 px-3 py-2 sm:px-5">
      <CyberTabs
        tabs={FEED_CATEGORIES}
        active={active}
        onChange={onChange}
        layoutId="feed-category-tab"
      />
    </div>
  );
}
