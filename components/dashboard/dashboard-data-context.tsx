"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type DashboardUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

export type DashboardSummary = {
  income: number;
  expense: number;
  totalBalance?: number;
} | null;

export type DashboardAppInfo = {
  appName: string;
  appVersion: string;
  patchVersion: string;
  fullVersion: string;
} | null;

export type DashboardTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  financialAccount?: { id: string; name: string } | null;
  categoryRef?: { id: string; name: string } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
};

export type DashboardData = {
  user: DashboardUser | null;
  summary: DashboardSummary;
  appInfo: DashboardAppInfo;
  recentTransactions: DashboardTransaction[];
  loading: boolean;
  refresh: () => void;
};

const DashboardDataContext = createContext<DashboardData | null>(null);

export function useDashboardData(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}

type DashboardDataProviderProps = {
  children: ReactNode;
};

export function DashboardDataProvider({ children }: DashboardDataProviderProps) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(null);
  const [appInfo, setAppInfo] = useState<DashboardAppInfo>(null);
  const [recentTransactions, setRecentTransactions] = useState<
    DashboardTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/init");
      if (!res.ok) {
        setUser(null);
        setSummary(null);
        setAppInfo(null);
        setRecentTransactions([]);
        return;
      }
      const data = (await res.json()) as {
        user?: { name?: string | null; email?: string | null; image?: string | null } | null;
        summary?: { income?: number; expense?: number; totalBalance?: number } | null;
        appInfo?: DashboardAppInfo;
        recentTransactions?: DashboardTransaction[] | unknown;
      };
      setUser(
        data.user
          ? {
              name: data.user.name ?? null,
              email: data.user.email ?? null,
              image: data.user.image ?? null,
            }
          : null
      );
      setSummary(
        data.summary && typeof data.summary === "object"
          ? {
              income: data.summary.income ?? 0,
              expense: data.summary.expense ?? 0,
              totalBalance: data.summary.totalBalance,
            }
          : null
      );
      setAppInfo(data.appInfo ?? null);
      setRecentTransactions(
        Array.isArray(data.recentTransactions) ? data.recentTransactions : []
      );
    } catch {
      setUser(null);
      setSummary(null);
      setAppInfo(null);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value: DashboardData = {
    user,
    summary,
    appInfo,
    recentTransactions,
    loading,
    refresh: load,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}
