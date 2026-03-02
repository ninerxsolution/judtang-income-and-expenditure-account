"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when running on localhost/127.0.0.1.
 * Used to skip Turnstile on local dev (avoids "Unable to connect" errors).
 */
export function useIsLocalhost(): boolean {
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    setIsLocalhost(host === "localhost" || host === "127.0.0.1");
  }, []);

  return isLocalhost;
}
