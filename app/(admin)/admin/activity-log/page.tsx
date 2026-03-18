"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useI18n } from "@/hooks/use-i18n";

type LogRow = {
  id: string;
  userId: string;
  user: { email: string | null; name: string | null };
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
  createdAt: string;
};

type ListResponse = {
  logs: LogRow[];
  total: number;
  page: number;
  limit: number;
};

export default function AdminActivityLogPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [loading, setLoading] = useState(true);

  // Details dialog
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (actionFilter) params.set("action", actionFilter);
    if (search) params.set("search", search);
    if (dateRange.from) params.set("fromDate", dateRange.from);
    if (dateRange.to) params.set("toDate", dateRange.to);

    queueMicrotask(() => setLoading(true));
    fetch(`/api/admin/activity-log?${params}`)
      .then((res) => {
        if (res.status === 403) {
          window.location.href = "/dashboard";
          return null;
        }
        return res.json();
      })
      .then((data: ListResponse | null) => {
        if (data) {
          setLogs(data.logs);
          setTotal(data.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, actionFilter, search, dateRange]);

  const totalPages = Math.ceil(total / limit);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">{t("admin.activityLog.title")}</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {t("admin.activityLog.subtitle")}
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="action">{t("admin.activityLog.action")}</Label>
          <Input
            id="action"
            type="text"
            placeholder={t("admin.activityLog.searchPlaceholder")}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("dashboard.settings.dateRange")}</Label>
          <DateRangePicker
            id="date-range"
            label={t("dashboard.settings.dateRange")}
            value={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
            onChange={(value) => {
              setDateRange({ from: value?.from ?? "", to: value?.to ?? "" });
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search">{t("admin.activityLog.search")}</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              type="text"
              placeholder={t("admin.activityLog.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
              className="w-48"
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                setSearch(searchInput);
                setPage(1);
              }}
              aria-label={t("admin.activityLog.search")}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/50">
                <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.date")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.user")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.action")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.entityType")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.entityId")}</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[#D4C9B0] dark:border-stone-800">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[#A09080] dark:text-stone-400">
          {t("admin.activityLog.empty")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/50">
                  <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.date")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.user")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.action")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.entityType")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.activityLog.entityId")}</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#D4C9B0] dark:border-stone-800 hover:bg-[#F5F0E8] dark:hover:bg-stone-900/30"
                  >
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400 font-mono text-xs">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      {log.entityType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400 font-mono text-xs">
                      {log.entityId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedLog(log)}
                        title={t("admin.users.viewDetails")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#A09080] dark:text-stone-400">
                {t("admin.activityLog.pageInfo", {
                  page: String(page),
                  totalPages: String(totalPages),
                  total: String(total),
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Details Dialog */}
      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl gap-0 p-0 rounded-2xl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{t("admin.activityLog.details")}</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#A09080] dark:text-stone-400">
                  {t("admin.activityLog.date")}
                </Label>
                <p className="mt-1 text-sm font-mono">
                  {selectedLog ? formatDate(selectedLog.createdAt) : "—"}
                </p>
              </div>
              <div>
                <Label className="text-[#A09080] dark:text-stone-400">
                  {t("admin.activityLog.user")}
                </Label>
                <p className="mt-1 text-sm">
                  {selectedLog?.user?.email ?? "—"}
                  {selectedLog?.user?.name && (
                    <span className="ml-2 text-[#6B5E4E] dark:text-stone-400">
                      ({selectedLog.user.name})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-[#A09080] dark:text-stone-400">
                {t("admin.activityLog.action")}
              </Label>
              <p className="mt-1 text-sm font-mono break-all">
                {selectedLog?.action ?? "—"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#A09080] dark:text-stone-400">
                  {t("admin.activityLog.entityType")}
                </Label>
                <p className="mt-1 text-sm">
                  {selectedLog?.entityType ?? "—"}
                </p>
              </div>
              <div>
                <Label className="text-[#A09080] dark:text-stone-400">
                  {t("admin.activityLog.entityId")}
                </Label>
                <p className="mt-1 text-sm font-mono">
                  {selectedLog?.entityId ?? "—"}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-[#A09080] dark:text-stone-400">
                {t("admin.activityLog.details")}
              </Label>
              <pre className="mt-1 rounded-md bg-[#F5F0E8] p-4 text-xs overflow-x-auto dark:bg-stone-900">
                {selectedLog?.details ? JSON.stringify(selectedLog.details, null, 2) : "{}"}
              </pre>
            </div>
          </div>
          <DialogClose asChild>
            <div className="p-4 pt-2">
              <Button className="w-full">{t("common.actions.close")}</Button>
            </div>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
