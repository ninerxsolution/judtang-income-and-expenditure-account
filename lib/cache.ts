/**
 * Application-level cache config for read-heavy API routes.
 * Uses Next.js unstable_cache with a shared revalidate interval.
 * @see docs/core/caching-strategy.md
 */
import { unstable_cache, revalidateTag } from "next/cache";

/** Default revalidation interval in seconds (30–60s per docs). */
export const CACHE_REVALIDATE_SECONDS = 45;

/**
 * Builds an array of cache key parts from a route name and optional params.
 * All parts are stringified so cache keys are stable and per-user.
 */
export function cacheKey(route: string, userId: string, ...parts: (string | number | undefined | null)[]): string[] {
  const safe = parts.map((p) => (p == null ? "" : String(p)));
  return [route, userId, ...safe];
}

export { unstable_cache, revalidateTag };
