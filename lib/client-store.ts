/** SSR-safe initial state: empty on server, loaded from store on client. */
export function clientInitial<T>(loader: () => T, serverFallback: T): T {
  if (typeof window === "undefined") return serverFallback;
  try {
    return loader();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[client-store] initial load failed:", err);
    }
    return serverFallback;
  }
}
