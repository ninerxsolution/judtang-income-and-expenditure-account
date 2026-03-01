"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EMAIL_MAX_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/validation";
import { FormField } from "./form-field";
import { useI18n } from "@/hooks/use-i18n";

type SignInFormProps = {
  callbackUrl?: string;
  error?: string | null;
};

export function SignInForm({ callbackUrl = "/dashboard", error: initialError }: SignInFormProps) {
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: true,
    });
    setPending(false);
    if (result?.error) {
      const message = t("auth.signIn.invalidCredentials");
      setError(message);
      toast.error(message);
      return;
    }
  }

  function handleGoogleClick() {
    signIn("google", { callbackUrl });
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <FormField
          id="signin-email"
          label={t("auth.signIn.emailLabel")}
          type="email"
          required
          value={email}
          onChange={setEmail}
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
        />
        <div className="space-y-2">
          <FormField
            id="signin-password"
            label={t("auth.signIn.passwordLabel")}
            type="password"
            required
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_LENGTH}
          />
          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary text-xs underline underline-offset-4"
            >
              {t("auth.signIn.forgotPassword")}
            </Link>
          </p>
        </div>
        {(error ?? initialError) && (
          <p className="text-destructive text-sm">{error ?? initialError}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t("auth.signIn.pending") : t("auth.signIn.submit")}
        </Button>
      </form>
      <div className="relative flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">
          {t("auth.signIn.or")}
        </span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleClick}
      >
          {t("auth.signIn.google")}
      </Button>
      <p className="text-center text-muted-foreground text-sm">
          {t("auth.signIn.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary underline underline-offset-4">
            {t("auth.signIn.registerCta")}
        </Link>
      </p>
    </div>
  );
}
