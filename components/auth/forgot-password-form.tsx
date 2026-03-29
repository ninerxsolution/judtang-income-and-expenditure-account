"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EMAIL_MAX_LENGTH } from "@/lib/validation";
import { FormField } from "./form-field";
import { TurnstileCaptcha } from "@/components/common/turnstile-captcha";
import { useI18n } from "@/hooks/use-i18n";
import { useIsLocalhost } from "@/hooks/use-is-localhost";

export function ForgotPasswordForm() {
  const { t, language } = useI18n();
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
  const isLocalhost = useIsLocalhost();
  const requiresTurnstile = !!sitekey && !isLocalhost;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (requiresTurnstile && !turnstileToken) {
      const msg = t("auth.turnstileRequired");
      setError(msg);
      toast.error(msg);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          language,
          ...(requiresTurnstile && { turnstileToken }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? t("common.errors.generic");
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }
      setSuccess(true);
      toast.success(t("auth.forgotPassword.success"));
    } catch {
      setError(t("common.errors.generic"));
      toast.error(t("common.errors.generic"));
    }
    setPending(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <p className="text-muted-foreground text-sm">
          {t("auth.forgotPassword.success")}
        </p>
        <p className="text-center text-sm">
          <Link
            href="/sign-in"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t("auth.forgotPassword.oauthHint")}
        </p>
        <FormField
          id="forgot-email"
          label={t("auth.forgotPassword.emailLabel")}
          type="email"
          required
          value={email}
          onChange={setEmail}
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
        />
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <TurnstileCaptcha onTokenChange={setTurnstileToken} />
        <Button
          type="submit"
          disabled={pending || (requiresTurnstile && !turnstileToken)}
          className="w-full"
        >
          {pending ? t("auth.forgotPassword.pending") : t("auth.forgotPassword.submit")}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("auth.forgotPassword.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
