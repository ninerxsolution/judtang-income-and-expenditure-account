"use client";

import { useFullscreen } from "@/components/dashboard/fullscreen-context";
import { cn } from "@/lib/utils";

type DashboardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function DashboardContent({ children, className }: DashboardContentProps) {
  const { fullscreen } = useFullscreen();

  return (
    <div
      className={cn(
        "mx-auto min-w-0 px-4 py-4 space-y-4",
        fullscreen ? "max-w-full" : "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}
