"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "judtang_balance_visible";

type BalanceVisibilityContextValue = {
  balanceVisible: boolean;
  toggleBalanceVisibility: () => void;
};

const BalanceVisibilityContext =
  createContext<BalanceVisibilityContextValue | null>(null);

function getStored(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored !== "0";
  } catch {
    return true;
  }
}

function setStored(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function BalanceVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [balanceVisible, setBalanceVisible] = useState(getStored);

  const toggleBalanceVisibility = useCallback(() => {
    setBalanceVisible((prev) => {
      const next = !prev;
      setStored(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ balanceVisible, toggleBalanceVisibility }),
    [balanceVisible, toggleBalanceVisibility]
  );

  return (
    <BalanceVisibilityContext.Provider value={value}>
      {children}
    </BalanceVisibilityContext.Provider>
  );
}

export function useBalanceVisibility() {
  const ctx = useContext(BalanceVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useBalanceVisibility must be used within BalanceVisibilityProvider."
    );
  }
  return ctx;
}
