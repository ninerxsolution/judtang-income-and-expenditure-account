"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

type VerifyEmailHandlerProps = {
  token: string;
};

export function VerifyEmailHandler({ token }: VerifyEmailHandlerProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.ok ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const linkClass =
    "font-medium text-[#3D3020] underline underline-offset-4 dark:text-stone-100";

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-[#6B5E4E] dark:text-stone-400">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <p>{t("auth.verifyEmail.verifying")}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-green-600 dark:text-green-400">
          {t("auth.verifyEmail.success")}
        </p>
        <p className="text-center text-sm text-[#6B5E4E] dark:text-stone-400">
          <Link href="/dashboard/me" className={linkClass}>
            {t("auth.verifyEmail.goToProfile")}
          </Link>
          {" · "}
          <Link href="/sign-in" className={linkClass}>
            {t("auth.verifyEmail.backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-destructive text-sm">
        {t("auth.verifyEmail.invalidOrExpired")}
      </p>
      <p className="text-center text-sm text-[#6B5E4E] dark:text-stone-400">
        <Link href="/dashboard/me" className={linkClass}>
          {t("auth.verifyEmail.goToProfileToResend")}
        </Link>
        {" · "}
        <Link href="/sign-in" className={linkClass}>
          {t("auth.verifyEmail.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
