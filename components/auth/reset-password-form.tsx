"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validation";
import { FormField } from "./form-field";
import { TurnstileCaptcha } from "@/components/common/turnstile-captcha";
import { useI18n } from "@/hooks/use-i18n";
import { useIsLocalhost } from "@/hooks/use-is-localhost";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
  const isLocalhost = useIsLocalhost();
  const requiresTurnstile = !!sitekey && !isLocalhost;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (requiresTurnstile && !turnstileToken) {
      const msg = t("auth.turnstileRequired");
      setError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      const msg = t("auth.register.passwordTooShort", { count: MIN_PASSWORD_LENGTH });
      setError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      const msg = t("auth.resetPassword.passwordTooLong");
      setError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = t("auth.resetPassword.passwordsMismatch");
      setError(msg);
      toast.error(msg);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          ...(requiresTurnstile && { turnstileToken }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? t("auth.resetPassword.invalidOrExpiredToken");
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }
      toast.success(t("auth.resetPassword.success"));
      router.push("/sign-in");
    } catch {
      setError(t("common.errors.generic"));
      toast.error(t("common.errors.generic"));
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="reset-new-password"
          label={t("auth.resetPassword.newPasswordLabel")}
          type="password"
          required
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
        />
        <FormField
          id="reset-confirm-password"
          label={t("auth.resetPassword.confirmPasswordLabel")}
          type="password"
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
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
          {pending ? t("auth.resetPassword.pending") : t("auth.resetPassword.submit")}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("auth.resetPassword.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
