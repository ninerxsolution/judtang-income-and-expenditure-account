"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { useAccountDetailBreadcrumb } from "@/components/dashboard/account-detail-breadcrumb-context";

export function getSegmentLabel(segment: string, _allSegments?: string[]): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    admin: "Admin",
    reports: "Reports",
    user: "User profile",
    me: "User profile",
    sessions: "Sessions",
    settings: "Settings",
    feedback: "Help & Feedback",
    "patch-note": "Patch note",
    transactions: "Transactions",
    tools: "Tools",
    calendar: "Calendar",
    "activity-log": "Activity log",
    accounts: "Accounts",
    "monthly-entry": "Monthly Entry",
  };

  if (map[segment]) return map[segment];

  if (/^[a-z0-9]{20,}$/i.test(segment) && _allSegments?.includes("reports")) {
    return "Report";
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

function isAccountDetailPath(segments: string[]): boolean {
  return (
    segments.length >= 3 &&
    segments[0] === "dashboard" &&
    segments[1] === "accounts" &&
    /^[a-z0-9]{20,}$/i.test(segments[2] ?? "")
  );
}

export function DashboardBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { accountName } = useAccountDetailBreadcrumb() ?? { accountName: null };

  if (!pathname) return null;

  // หน้าแรก (/dashboard) ไม่แสดง breadcrumb
  if (pathname === "/dashboard" || pathname === "/dashboard/") return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "(dashboard)");

  if (segments.length === 0) return null;

  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    let label: string;
    if (isAccountDetailPath(segments) && index === 2 && isLast) {
      label = accountName ?? "...";
    } else {
      label = getSegmentLabel(segment, segments);
    }

    return {
      href,
      label,
      isLast,
    };
  });

  return (
    <nav aria-label={t("common.aria.breadcrumb")} className={cn("text-sm text-muted-foreground", className)}>
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

