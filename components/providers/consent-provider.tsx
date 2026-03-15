"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type ConsentData, getStoredConsent, saveConsent } from "@/lib/consent";

type ConsentState = {
  consent: ConsentData | null;
  hasDecided: boolean;
  mounted: boolean;
};

type ConsentContextValue = ConsentState & {
  acceptAll: () => void;
  savePreferences: (analytics: boolean) => void;
};

const initialState: ConsentState = {
  consent: null,
  hasDecided: false,
  mounted: false,
};

export const ConsentContext = createContext<ConsentContextValue>({
  ...initialState,
  acceptAll: () => {},
  savePreferences: () => {},
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState>(initialState);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = getStoredConsent();
      setState({
        consent: stored,
        hasDecided: stored !== null,
        mounted: true,
      });
    });
  }, []);

  const acceptAll = useCallback(() => {
    const data = saveConsent(true);
    setState({ consent: data, hasDecided: true, mounted: true });
  }, []);

  const savePreferences = useCallback((analytics: boolean) => {
    const data = saveConsent(analytics);
    setState({ consent: data, hasDecided: true, mounted: true });
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({ ...state, acceptAll, savePreferences }),
    [state, acceptAll, savePreferences],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
