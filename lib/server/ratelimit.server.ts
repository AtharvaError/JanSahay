// Small sliding-window rate limiter. In-memory, so limits are per server instance — enough to stop
// OTP spam and the "resend to reset the guess counter" trick on a single deployment; put a shared
// store (e.g. Redis / the database) behind this if the app runs on many instances.
const hits = new Map<string, number[]>();

/** Returns 0 if allowed (and records the hit), otherwise the seconds to wait. */
export function rateLimit(key: string, rules: { max: number; windowMs: number }[]): number {
  const now = Date.now();
  const longest = Math.max(...rules.map(r => r.windowMs));
  const list = (hits.get(key) ?? []).filter(t => now - t < longest);
  for (const { max, windowMs } of rules) {
    const inWindow = list.filter(t => now - t < windowMs);
    if (inWindow.length >= max) {
      hits.set(key, list);
      return Math.ceil((windowMs - (now - inWindow[0])) / 1000);
    }
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some(t => now - t < longest)) hits.delete(k);
  return 0;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}
