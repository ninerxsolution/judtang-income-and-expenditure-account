"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when Turnstile verification should be skipped (localhost only).
 * Staging uses Turnstile; add staging domain to Cloudflare Turnstile allowlist.
 */
export function useIsLocalhost(): boolean {
  const [skipTurnstile, setSkipTurnstile] = useState(false);

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    setSkipTurnstile(host === "localhost" || host === "127.0.0.1");
  }, []);

  return skipTurnstile;
}
