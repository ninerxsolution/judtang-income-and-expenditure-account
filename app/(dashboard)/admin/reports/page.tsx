"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type ReportRow = {
  id: string;
  category: string;
  title: string;
  status: string;
  createdAt: string;
  user: { email: string | null; name: string | null };
};

type ListResponse = {
  reports: ReportRow[];
  total: number;
  page: number;
  limit: number;
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (status) params.set("status", status);
    if (search) params.set("search", search);

    queueMicrotask(() => setLoading(true));
    fetch(`/api/reports?${params}`)
      .then((res) => {
        if (res.status === 403) {
          window.location.href = "/dashboard";
          return null;
        }
        return res.json();
      })
      .then((data: ListResponse | null) => {
        if (data) {
          setReports(data.reports);
          setTotal(data.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, status, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          Manage user feedback and bug reports
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              type="text"
              placeholder="Title or email..."
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
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-[#A09080] dark:text-stone-400">
          No reports found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#D4C9B0] dark:border-stone-800 hover:bg-[#F5F0E8] dark:hover:bg-stone-900/30"
                  >
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {formatCategory(r.category)}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {r.title}
                    </td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {r.user?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === "OPEN"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : r.status === "IN_REVIEW"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : r.status === "RESOLVED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-[#EBF4E3] text-[#6B5E4E] dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/reports/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#A09080] dark:text-stone-400">
                Page {page} of {totalPages} ({total} total)
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
    </div>
  );
}
