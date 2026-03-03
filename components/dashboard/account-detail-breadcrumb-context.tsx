"use client";

import { createContext, useContext, useState, useCallback } from "react";

type AccountDetailBreadcrumbContextValue = {
  accountName: string | null;
  setAccountName: (name: string | null) => void;
};

const AccountDetailBreadcrumbContext = createContext<AccountDetailBreadcrumbContextValue | null>(
  null
);

export function AccountDetailBreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accountName, setAccountNameState] = useState<string | null>(null);
  const setAccountName = useCallback((name: string | null) => {
    setAccountNameState(name);
  }, []);

  return (
    <AccountDetailBreadcrumbContext.Provider value={{ accountName, setAccountName }}>
      {children}
    </AccountDetailBreadcrumbContext.Provider>
  );
}

export function useAccountDetailBreadcrumb() {
  return useContext(AccountDetailBreadcrumbContext);
}
