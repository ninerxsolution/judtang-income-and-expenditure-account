/**
 * Dashboard route group layout (protected by proxy).
 * Wraps all dashboard pages.
 */
import type { Metadata } from "next";
import { SessionTouch } from "@/components/dashboard/session-touch";
import { AppSidebarLayout } from "@/components/dashboard/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { DashboardPageTitle } from "@/components/dashboard/dashboard-page-title";

export const metadata: Metadata = {
  title: "Dashboard | Judtang",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SessionTouch />
      <SidebarProvider>
        <AppSidebarLayout>
          <DashboardBreadcrumb className="px-4 py-4" />
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            <DashboardPageTitle />
            {children}
          </div>
        </AppSidebarLayout>
      </SidebarProvider>
    </div>
  );
}
