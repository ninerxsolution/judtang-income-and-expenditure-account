"use client";

import { usePathname } from "next/navigation";
import { useFullscreen } from "@/components/dashboard/fullscreen-context";
import { cn } from "@/lib/utils";

type DashboardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function DashboardContent({ children, className }: DashboardContentProps) {
  const { fullscreen } = useFullscreen();
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={cn(
        "mx-auto min-w-0 px-4 py-4 space-y-4",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-350",
        fullscreen ? "max-w-full" : "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}
