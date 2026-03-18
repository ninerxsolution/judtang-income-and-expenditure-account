"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "judtang_admin_mode";

type AdminModeContextValue = {
  isAdminMode: boolean;
  setAdminMode: (value: boolean) => void;
  toggleAdminMode: () => void;
};

const AdminModeContext = createContext<AdminModeContextValue | null>(null);

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

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdminMode, setAdminModeState] = useState(getStored);

  const setAdminMode = useCallback((value: boolean) => {
    setAdminModeState(() => {
      setStored(value);
      return value;
    });
  }, []);

  const toggleAdminMode = useCallback(() => {
    setAdminModeState((prev) => {
      const next = !prev;
      setStored(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isAdminMode, setAdminMode, toggleAdminMode }),
    [isAdminMode, setAdminMode, toggleAdminMode]
  );

  return (
    <AdminModeContext.Provider value={value}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const ctx = useContext(AdminModeContext);
  if (!ctx) {
    throw new Error("useAdminMode must be used within AdminModeProvider.");
  }
  return ctx;
}
