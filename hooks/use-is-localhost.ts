"use client";

import { useState } from "react";

/**
 * Returns true when Turnstile verification should be skipped (localhost only).
 * Staging uses Turnstile; add staging domain to Cloudflare Turnstile allowlist.
 */
export function useIsLocalhost(): boolean {
  const [skipTurnstile] = useState(() => {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  });

  return skipTurnstile;
}
