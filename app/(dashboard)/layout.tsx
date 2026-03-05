/**
 * Dashboard route group layout (protected by proxy).
 * Wraps all dashboard pages.
 */
import type { Metadata } from "next";
import { SessionTouch } from "@/components/dashboard/session-touch";
import { AppSidebarLayout } from "@/components/dashboard/app-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardPageTitle } from "@/components/dashboard/dashboard-page-title";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { TransactionFormProvider } from "@/components/dashboard/transaction-form-context";
import { FullscreenProvider } from "@/components/dashboard/fullscreen-context";
import { AccountDetailBreadcrumbProvider } from "@/components/dashboard/account-detail-breadcrumb-context";
import { SidebarProvider } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-page h-dvh min-h-dvh overflow-hidden">
      <SessionTouch />
      <DashboardDataProvider>
        <TransactionFormProvider>
          <FullscreenProvider>
            <AccountDetailBreadcrumbProvider>
              <SidebarProvider className="h-dvh overflow-hidden">
                <AppSidebarLayout>
                  <DashboardBreadcrumb className="px-4 py-4" />
                  <DashboardContent>
                    <DashboardPageTitle />
                    {children}
                  </DashboardContent>
                </AppSidebarLayout>
              </SidebarProvider>
            </AccountDetailBreadcrumbProvider>
          </FullscreenProvider>
        </TransactionFormProvider>
      </DashboardDataProvider>
    </div>
  );
}
