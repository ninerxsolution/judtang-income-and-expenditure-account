"use client";

import { useEffect } from "react";

/**
 * Calls POST /api/sessions on mount so the current session gets
 * lastActiveAt, userAgent, and ipAddress updated when the user is on any dashboard page.
 */
export function SessionTouch() {
  useEffect(() => {
    fetch("/api/sessions", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, []);
  return null;
}
