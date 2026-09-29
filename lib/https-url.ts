export function isAllowedHttpsUrl(raw: string, opts?: { allowHttp?: boolean }): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === "https:") return true;
    return Boolean(opts?.allowHttp && url.protocol === "http:");
  } catch {
    return false;
  }
}
