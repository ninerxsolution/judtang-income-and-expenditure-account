"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SlipUploadDialog } from "@/components/dashboard/slip-upload-dialog";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";

type OpenSlipUploadOptions = {
  onSuccess?: () => void;
};

const SlipUploadContext = createContext<{
  openSlipUpload: (options?: OpenSlipUploadOptions) => void;
} | null>(null);

export function useSlipUpload(): {
  openSlipUpload: (options?: OpenSlipUploadOptions) => void;
} {
  const ctx = useContext(SlipUploadContext);
  if (!ctx) {
    throw new Error("useSlipUpload must be used within SlipUploadProvider");
  }
  return ctx;
}

type SlipUploadProviderProps = {
  children: ReactNode;
};

export function SlipUploadProvider({ children }: SlipUploadProviderProps) {
  const [open, setOpen] = useState(false);
  const successCallbackRef = useRef<(() => void) | null>(null);
  const { refresh } = useDashboardData();

  const openSlipUpload = useCallback((options?: OpenSlipUploadOptions) => {
    successCallbackRef.current = options?.onSuccess ?? null;
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      successCallbackRef.current = null;
    }
    setOpen(nextOpen);
  }, []);

  const handleSuccess = useCallback(() => {
    refresh();
    successCallbackRef.current?.();
    successCallbackRef.current = null;
  }, [refresh]);

  return (
    <SlipUploadContext.Provider value={{ openSlipUpload }}>
      {children}
      <SlipUploadDialog
        open={open}
        onOpenChange={handleOpenChange}
        onSuccess={handleSuccess}
      />
    </SlipUploadContext.Provider>
  );
}
