"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import MonthlyEntryPage from "@/app/(dashboard)/dashboard/monthly-entry/page";
import RecurringPage from "@/app/(dashboard)/dashboard/recurring/page";

type TabId = "monthly" | "recurring";

const TAB_IDS: TabId[] = ["monthly", "recurring"];

function EntryContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: TabId = rawTab === "recurring" ? "recurring" : "monthly";

  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<TabId>>(
    () => new Set<TabId>([activeTab]),
  );

  const monthlyMounted = mountedTabs.has("monthly");
  const recurringMounted = mountedTabs.has("recurring");

  function handleTabClick(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/dashboard/entry?${params.toString()}`);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set<TabId>([...prev, tab]);
    });
  }

  const tabLabels: Record<TabId, string> = {
    monthly: t("entry.tabs.monthly"),
    recurring: t("entry.tabs.recurring"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {t("dashboard.sidebar.entry")}
        </h1>
      </div>

      <div
        className="flex gap-1 border-b border-border"
        role="tablist"
        aria-label={t("dashboard.sidebar.entry")}
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

      <div id="tabpanel-monthly" role="tabpanel" aria-labelledby="tab-monthly">
        {monthlyMounted && (
          <div className={activeTab === "monthly" ? "block" : "hidden"}>
            <MonthlyEntryPage />
          </div>
        )}
      </div>

      <div
        id="tabpanel-recurring"
        role="tabpanel"
        aria-labelledby="tab-recurring"
      >
        {recurringMounted && (
          <div className={activeTab === "recurring" ? "block" : "hidden"}>
            <RecurringPage />
          </div>
        )}
      </div>
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <EntryContent />
    </Suspense>
  );
}
