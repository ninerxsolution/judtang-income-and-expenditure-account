"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/hooks/use-i18n";
import SummaryPage from "@/app/(dashboard)/dashboard/summary/page";
import SpendingEfficiencyPage from "@/app/(dashboard)/dashboard/spending-efficiency/page";
import { cn } from "@/lib/utils";

type TabId = "summary" | "efficiency";

const TAB_IDS: TabId[] = ["summary", "efficiency"];

function ReportsContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: TabId =
    rawTab === "efficiency" ? "efficiency" : "summary";

  function handleTabClick(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/dashboard/reports?${params.toString()}`);
  }

  const tabLabels: Record<TabId, string> = {
    summary: t("reports.tabs.summary"),
    efficiency: t("reports.tabs.efficiency"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {t("dashboard.sidebar.reports")}
        </h1>
      </div>

      <div
        className="flex gap-1 border-b border-border"
        role="tablist"
        aria-label={t("dashboard.sidebar.reports")}
      >
        {TAB_IDS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            onClick={() => handleTabClick(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div
        id={`tabpanel-summary`}
        role="tabpanel"
        aria-labelledby="tab-summary"
        hidden={activeTab !== "summary"}
      >
        {activeTab === "summary" && <SummaryPage />}
      </div>

      <div
        id={`tabpanel-efficiency`}
        role="tabpanel"
        aria-labelledby="tab-efficiency"
        hidden={activeTab !== "efficiency"}
      >
        {activeTab === "efficiency" && <SpendingEfficiencyPage />}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>}>
      <ReportsContent />
    </Suspense>
  );
}
