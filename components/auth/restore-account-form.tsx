"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EMAIL_MAX_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/validation";
import { FormField } from "./form-field";
import { useI18n } from "@/hooks/use-i18n";

export function RestoreAccountForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/restore-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? t("auth.restoreAccount.error");
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }
      setSuccess(true);
      toast.success(t("auth.restoreAccount.success"));
      router.push("/sign-in");
    } catch {
      setError(t("auth.restoreAccount.error"));
      toast.error(t("auth.restoreAccount.error"));
    }
    setPending(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <p className="text-muted-foreground text-sm">
          {t("auth.restoreAccount.success")}
        </p>
        <p className="text-center text-sm">
          <Link
            href="/sign-in"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("auth.restoreAccount.backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="restore-email"
          label={t("auth.restoreAccount.emailLabel")}
          type="email"
          required
          value={email}
          onChange={setEmail}
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
        />
        <FormField
          id="restore-password"
          label={t("auth.restoreAccount.passwordLabel")}
          type="password"
          required
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          maxLength={MAX_PASSWORD_LENGTH}
        />
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t("auth.restoreAccount.pending") : t("auth.restoreAccount.submit")}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("auth.restoreAccount.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
