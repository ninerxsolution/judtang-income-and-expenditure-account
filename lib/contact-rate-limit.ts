/**
 * In-memory rate limit for public contact form submissions by client IP.
 * Max 5 submissions per IP per hour (same window as report limit).
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function prune(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

function keyForIp(ip: string): string {
  return `contact:${ip}`;
}

export function checkContactRateLimit(ip: string): { allowed: boolean; remaining: number } {
  prune();
  const key = keyForIp(ip || "unknown");
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    store.set(key, entry);
  }
  if (entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    store.set(key, entry);
  }
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count < RATE_LIMIT_MAX, remaining };
}

export function incrementContactRateLimit(ip: string): void {
  prune();
  const key = keyForIp(ip || "unknown");
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    store.set(key, entry);
  }
  if (entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    store.set(key, entry);
  }
  entry.count++;
}
