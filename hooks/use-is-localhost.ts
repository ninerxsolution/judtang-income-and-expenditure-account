"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when Turnstile verification should be skipped (localhost or staging).
 * Used to skip Turnstile on local dev and staging (avoids "Unable to connect" or
 * domain allowlist issues before production).
 */
export function useIsLocalhost(): boolean {
  const [skipTurnstile, setSkipTurnstile] = useState(false);

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    setSkipTurnstile(
      host === "localhost" ||
        host === "127.0.0.1" ||
        host.includes("staging.")
    );
  }, []);

  return skipTurnstile;
}
