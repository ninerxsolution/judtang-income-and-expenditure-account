"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type MessageRow = {
  id: string;
  topic: string;
  subject: string;
  senderEmail: string;
  senderName: string | null;
  emailSent: boolean;
  createdAt: string;
};

type ListResponse = {
  messages: MessageRow[];
  total: number;
  page: number;
  limit: number;
};

export default function AdminContactMessagesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);

    queueMicrotask(() => setLoading(true));
    fetch(`/api/admin/contact-messages?${params}`)
      .then((res) => {
        if (res.status === 403) {
          window.location.href = "/dashboard";
          return null;
        }
        return res.json();
      })
      .then((data: ListResponse | null) => {
        if (data) {
          setRows(data.messages);
          setTotal(data.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">{t("admin.contactMessages.title")}</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {t("admin.contactMessages.subtitle")}
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="cm-search">{t("admin.contactMessages.search")}</Label>
          <div className="flex gap-2">
            <Input
              id="cm-search"
              type="text"
              placeholder={t("admin.contactMessages.searchPlaceholder")}
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
              aria-label={t("admin.contactMessages.search")}
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
                <th className="px-4 py-3 text-left font-medium text-[#3D3020] dark:text-stone-100">
                  {t("admin.contactMessages.date")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#3D3020] dark:text-stone-100">
                  {t("admin.contactMessages.topic")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#3D3020] dark:text-stone-100">
                  {t("admin.contactMessages.subject")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#3D3020] dark:text-stone-100">
                  {t("admin.contactMessages.sender")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#3D3020] dark:text-stone-100">
                  {t("admin.contactMessages.emailSent")}
                </th>
                <th className="px-4 py-3 text-left font-medium" />
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[#D4C9B0] dark:border-stone-800">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-10" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#A09080] dark:text-stone-400">
          {t("admin.contactMessages.empty")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/50">
                  <th className="px-4 py-3 text-left font-medium">{t("admin.contactMessages.date")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.contactMessages.topic")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.contactMessages.subject")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.contactMessages.sender")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.contactMessages.emailSent")}</th>
                  <th className="px-4 py-3 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#D4C9B0] dark:border-stone-800 hover:bg-[#F5F0E8] dark:hover:bg-stone-900/30"
                  >
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {t(`publicContact.topics.${r.topic}`)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3">{r.subject}</td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {r.senderName ? `${r.senderName} <${r.senderEmail}>` : r.senderEmail}
                    </td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {r.emailSent
                        ? t("admin.contactMessages.emailSentYes")
                        : t("admin.contactMessages.emailSentNo")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/contact-messages/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {t("admin.contactMessages.view")}
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
                {t("admin.contactMessages.pageInfo", {
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
                  onClick={() => setPage((p) => p + 1)}
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
