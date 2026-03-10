"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type ReportDetail = {
  id: string;
  category: string;
  title: string;
  description: string;
  route: string | null;
  appVersion: string | null;
  browserInfo: string | null;
  ipAddress: string | null;
  status: string;
  imagePaths: string[];
  createdAt: string;
  updatedAt: string;
  user: { email: string | null; name: string | null };
};

const STATUS_OPTIONS = [
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

export default function AdminReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => {
        if (res.status === 403) {
          router.push("/dashboard");
          return null;
        }
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data: ReportDetail | null) => {
        if (data) {
          setReport(data);
          setStatus(data.status);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleStatusChange() {
    if (!report || status === report.status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReport((prev) => (prev ? { ...prev, status } : null));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !report) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
        <header>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-1 h-4 w-40" />
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-[#A09080] dark:text-stone-400">
                Description
              </Label>
              <Skeleton className="mt-1 h-32 w-full rounded-md" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL ?? "";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
      </div>

      <header>
        <h1 className="text-xl font-semibold">{report.title}</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {formatCategory(report.category)} • {report.user?.email ?? "—"}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label className="text-[#A09080] dark:text-stone-400">
              Description
            </Label>
            <p className="mt-1 whitespace-pre-wrap rounded-md border border-[#D4C9B0] bg-[#F5F0E8]/50 p-4 text-sm dark:border-stone-700 dark:bg-stone-900/30">
              {report.description}
            </p>
          </div>

          {report.imagePaths.length > 0 && (
            <div>
              <Label className="text-[#A09080] dark:text-stone-400">
                Screenshots
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {report.imagePaths.map((relPath, i) => {
                  const filename = relPath.split("/").pop() ?? "";
                  const imgUrl = `${baseUrl}/api/reports/${report.id}/image/${filename}`;
                  return (
                    <a
                      key={i}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Image
                        src={imgUrl}
                        alt={`Screenshot ${i + 1}`}
                        width={96}
                        height={96}
                        className="h-24 w-auto rounded border border-[#D4C9B0] object-cover dark:border-stone-700"
                        unoptimized
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <div className="mt-2 flex gap-2">
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 flex-1 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => void handleStatusChange()}
                disabled={saving || status === report.status}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-[#D4C9B0] bg-[#F5F0E8]/50 p-4 text-sm dark:border-stone-700 dark:bg-stone-900/30">
            <h3 className="font-medium text-[#3D3020] dark:text-stone-100">
              Metadata
            </h3>
            <dl className="mt-2 space-y-1 text-xs text-[#6B5E4E] dark:text-stone-400">
              <div>
                <dt className="inline font-medium">Route:</dt>{" "}
                <dd className="inline">{report.route ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium">App version:</dt>{" "}
                <dd className="inline">{report.appVersion ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Submitted:</dt>{" "}
                <dd className="inline">
                  {new Date(report.createdAt).toLocaleString()}
                </dd>
              </div>
              {report.browserInfo && (
                <div>
                  <dt className="inline font-medium">User-Agent:</dt>{" "}
                  <dd className="inline break-all">{report.browserInfo}</dd>
                </div>
              )}
              {report.ipAddress && (
                <div>
                  <dt className="inline font-medium">IP:</dt>{" "}
                  <dd className="inline">{report.ipAddress}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
