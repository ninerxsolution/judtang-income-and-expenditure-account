import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LandingDoodleBackground } from "@/components/landing/landing-doodle-background";

type LandingPublicShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared layout shell for public landing and information pages with doodle background.
 */
export function LandingPublicShell({ children, className }: LandingPublicShellProps) {
  return (
    <div
      className={cn(
        "landing-page relative min-h-screen overflow-x-hidden bg-[#F5F0E8] dark:bg-stone-950",
        className,
      )}
    >
      <LandingDoodleBackground />
      <div className="relative z-1 flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
