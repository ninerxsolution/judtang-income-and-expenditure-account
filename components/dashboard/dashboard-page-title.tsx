"use client";

import { usePathname } from "next/navigation";
import { getSegmentLabel } from "@/components/dashboard/dashboard-breadcrumb";

export function DashboardPageTitle() {
  const pathname = usePathname();

  if (!pathname) return null;

  // หน้าแรก (/dashboard) ไม่แสดง title
  if (pathname === "/dashboard" || pathname === "/dashboard/") return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "(dashboard)");

  if (segments.length === 0) return null;

  const lastSegment = segments[segments.length - 1];
  const title = getSegmentLabel(lastSegment, segments);

  return (
    <h1 className="text-2xl font-semibold">
      {title}
    </h1>
  );
}

