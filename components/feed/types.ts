export type FeedCategory = "feed" | "passport" | "leaderboard";

export type FeedRole = "fighter" | "coach" | "athlete";

export const FEED_CATEGORIES: ReadonlyArray<{
  id: FeedCategory;
  label: string;
}> = [
  { id: "feed", label: "Лента" },
  { id: "passport", label: "Паспорт" },
  { id: "leaderboard", label: "Топ" },
];

export const FEED_ROLES: FeedRole[] = ["fighter", "coach", "athlete"];

export const DEMO_HIGHLIGHT_URL =
  "https://www.youtube.com/watch?v=LXb3EKWsInQ";
