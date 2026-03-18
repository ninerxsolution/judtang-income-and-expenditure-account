/**
 * Admin route group layout (protected by proxy).
 * Wraps all admin pages.
 */
import type { Metadata } from "next";
import { SessionTouch } from "@/components/dashboard/session-touch";
import { AdminSidebarLayout } from "@/components/dashboard/admin-sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardPageTitle } from "@/components/dashboard/dashboard-page-title";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { SlipUploadProvider } from "@/components/dashboard/slip-upload-context";
import { TransactionFormProvider } from "@/components/dashboard/transaction-form-context";
import { FullscreenProvider } from "@/components/dashboard/fullscreen-context";
import { AdminModeProvider } from "@/components/dashboard/admin-mode-context";
import { SidebarProvider } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-page h-dvh min-h-dvh overflow-hidden">
      <SessionTouch />
      <DashboardDataProvider>
        <AdminModeProvider>
          <SlipUploadProvider>
            <TransactionFormProvider>
              <FullscreenProvider>
                <SidebarProvider className="h-dvh overflow-hidden">
                <AdminSidebarLayout>
                  <DashboardBreadcrumb className="px-4 py-4" />
                  <DashboardContent>
                    <DashboardPageTitle />
                    {children}
                  </DashboardContent>
                </AdminSidebarLayout>
                </SidebarProvider>
              </FullscreenProvider>
            </TransactionFormProvider>
          </SlipUploadProvider>
        </AdminModeProvider>
      </DashboardDataProvider>
    </div>
  );
}
