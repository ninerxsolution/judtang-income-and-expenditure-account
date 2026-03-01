"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  if (status === "loading") {
    return (
      <p className="text-muted-foreground text-sm">
        {t("auth.verifyEmail.verifying")}
      </p>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-4">
        <p className="text-green-600 dark:text-green-400 text-sm">
          {t("auth.verifyEmail.success")}
        </p>
        <p className="text-center text-sm">
          <Link
            href="/dashboard/me"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("auth.verifyEmail.goToProfile")}
          </Link>
          {" · "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline underline-offset-4"
          >
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
      <p className="text-center text-sm">
        <Link
          href="/dashboard/me"
          className="font-medium text-primary underline underline-offset-4"
        >
          {t("auth.verifyEmail.goToProfileToResend")}
        </Link>
        {" · "}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline underline-offset-4"
        >
          {t("auth.verifyEmail.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
