"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "judtang_fullscreen";

type FullscreenContextValue = {
  fullscreen: boolean;
  toggleFullscreen: () => void;
};

const FullscreenContext = createContext<FullscreenContextValue | null>(null);

function getStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setStored(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function FullscreenProvider({ children }: { children: React.ReactNode }) {
  const [fullscreen, setFullscreenState] = useState(getStored);

  const toggleFullscreen = useCallback(() => {
    setFullscreenState((prev) => {
      const next = !prev;
      setStored(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ fullscreen, toggleFullscreen }),
    [fullscreen, toggleFullscreen]
  );

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
}

export function useFullscreen() {
  const ctx = useContext(FullscreenContext);
  if (!ctx) {
    throw new Error("useFullscreen must be used within FullscreenProvider.");
  }
  return ctx;
}
