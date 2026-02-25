"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function getSegmentLabel(segment: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    user: "User profile",
    sessions: "Sessions",
    transactions: "Transactions",
    tools: "Tools",
    calendar: "Calendar",
    "activity-log": "Activity log",
  };

  if (map[segment]) return map[segment];

  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function DashboardBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();

  if (!pathname) return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "(dashboard)");

  if (segments.length === 0) return null;

  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    return {
      href,
      label: getSegmentLabel(segment),
      isLast,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/70" />
            )}
            {item.isLast ? (
              <span className="font-medium text-foreground">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

