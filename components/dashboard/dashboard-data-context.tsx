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

export type DashboardTransactionAccount = {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  cardNetwork?: string | null;
  accountNumberMasked?: string | null;
};

export type DashboardTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  financialAccount?: DashboardTransactionAccount | null;
  transferAccount?: DashboardTransactionAccount | null;
  categoryRef?: { id: string; name: string; nameEn?: string | null } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
};

export type DashboardData = {
  user: DashboardUser | null;
  summary: DashboardSummary;
  appInfo: DashboardAppInfo;
  recentTransactions: DashboardTransaction[];
  accountCount: number;
  loading: boolean;
  refresh: () => void;
  /** บวกทุกครั้งที่ควร refetch มุมมองที่ผูกกับธุรกรรม (เช่น ปฏิทิน) — ไม่เกี่ยวกับการโหลด dashboard/init */
  transactionViewsEpoch: number;
  invalidateTransactionViews: () => void;
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
  const [accountCount, setAccountCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactionViewsEpoch, setTransactionViewsEpoch] = useState(0);

  const invalidateTransactionViews = useCallback(() => {
    setTransactionViewsEpoch((n) => n + 1);
  }, []);

  type LoadOptions = { showLoadingOverlay?: boolean };

  const load = useCallback(async (options?: LoadOptions) => {
    const showLoadingOverlay = options?.showLoadingOverlay !== false;
    if (showLoadingOverlay) {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/dashboard/init", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setSummary(null);
      setAppInfo(null);
      setRecentTransactions([]);
      setAccountCount(0);
      return;
      }
      const data = (await res.json()) as {
        user?: { name?: string | null; email?: string | null; image?: string | null } | null;
        summary?: { income?: number; expense?: number; totalBalance?: number } | null;
        appInfo?: DashboardAppInfo;
        recentTransactions?: DashboardTransaction[] | unknown;
        accountCount?: number;
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
      setAccountCount(typeof data.accountCount === "number" ? data.accountCount : 0);
    } catch {
      setUser(null);
      setSummary(null);
      setAppInfo(null);
      setRecentTransactions([]);
      setAccountCount(0);
    } finally {
      if (showLoadingOverlay) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load({ showLoadingOverlay: true });
  }, [load]);

  const refresh = useCallback(() => {
    void load({ showLoadingOverlay: false });
  }, [load]);

  const value: DashboardData = {
    user,
    summary,
    appInfo,
    recentTransactions,
    accountCount,
    loading,
    refresh,
    transactionViewsEpoch,
    invalidateTransactionViews,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}
