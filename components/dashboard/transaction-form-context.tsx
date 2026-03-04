"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

const TransactionFormContext = createContext<{
  openQuickAdd: (type: TransactionType) => void;
} | null>(null);

export function useTransactionForm(): {
  openQuickAdd: (type: TransactionType) => void;
} {
  const ctx = useContext(TransactionFormContext);
  if (!ctx) {
    throw new Error(
      "useTransactionForm must be used within TransactionFormProvider"
    );
  }
  return ctx;
}

type TransactionFormProviderProps = {
  children: ReactNode;
};

export function TransactionFormProvider({ children }: TransactionFormProviderProps) {
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState<TransactionType>("EXPENSE");
  const { refresh } = useDashboardData();

  const openQuickAdd = useCallback((type: TransactionType) => {
    setInitialType(type);
    setOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <TransactionFormContext.Provider value={{ openQuickAdd }}>
      {children}
      <TransactionFormDialog
        open={open}
        onOpenChange={setOpen}
        initialType={initialType}
        onSuccess={handleSuccess}
      />
    </TransactionFormContext.Provider>
  );
}
