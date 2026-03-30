"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type Detail = {
  id: string;
  topic: string;
  subject: string;
  message: string;
  senderEmail: string;
  senderName: string | null;
  uiLanguage: string;
  ipAddress: string | null;
  browserInfo: string | null;
  emailSentAt: string | null;
  createdAt: string;
};

export default function AdminContactMessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = params.id as string;
  const [row, setRow] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/contact-messages/${id}`)
      .then((res) => {
        if (res.status === 403) {
          router.push("/dashboard");
          return null;
        }
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data: Detail | null) => {
        if (data) setRow(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !row) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Link
          href="/admin/contact-messages"
          className="inline-flex items-center gap-1 text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.contactMessages.back")}
        </Link>
        <header>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-1 h-4 w-40" />
        </header>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Link
        href="/admin/contact-messages"
        className="inline-flex items-center gap-1 text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.contactMessages.back")}
      </Link>

      <header>
        <h1 className="text-xl font-semibold">{t("admin.contactMessages.detailTitle")}</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {new Date(row.createdAt).toLocaleString()}
        </p>
      </header>

      <div className="space-y-4 rounded-lg border border-[#D4C9B0] bg-[#FDFAF4]/50 p-4 dark:border-stone-700 dark:bg-stone-900/30">
        <div>
          <Label className="text-muted-foreground">{t("admin.contactMessages.topic")}</Label>
          <p className="text-sm">{t(`publicContact.topics.${row.topic}`)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t("admin.contactMessages.subject")}</Label>
          <p className="text-sm">{row.subject}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t("admin.contactMessages.sender")}</Label>
          <p className="text-sm">
            {row.senderName
              ? `${row.senderName} <${row.senderEmail}>`
              : row.senderEmail}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t("admin.contactMessages.uiLanguage")}</Label>
          <p className="text-sm">{row.uiLanguage}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t("admin.contactMessages.emailSent")}</Label>
          <p className="text-sm">
            {row.emailSentAt
              ? new Date(row.emailSentAt).toLocaleString()
              : t("admin.contactMessages.emailSentNo")}
          </p>
        </div>
        {row.ipAddress ? (
          <div>
            <Label className="text-muted-foreground">{t("admin.contactMessages.ipAddress")}</Label>
            <p className="font-mono text-sm">{row.ipAddress}</p>
          </div>
        ) : null}
        {row.browserInfo ? (
          <div>
            <Label className="text-muted-foreground">{t("admin.contactMessages.browser")}</Label>
            <p className="break-all text-sm">{row.browserInfo}</p>
          </div>
        ) : null}
        <div>
          <Label className="text-muted-foreground">{t("admin.contactMessages.message")}</Label>
          <pre className="mt-1 whitespace-pre-wrap rounded-md border border-[#D4C9B0] bg-white p-3 text-sm dark:border-stone-600 dark:bg-stone-950">
            {row.message}
          </pre>
        </div>
      </div>

      <Button variant="outline" asChild>
        <Link href={`mailto:${encodeURIComponent(row.senderEmail)}`}>
          {t("admin.contactMessages.replyByEmail")}
        </Link>
      </Button>
    </div>
  );
}
