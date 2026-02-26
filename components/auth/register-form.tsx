"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  EMAIL_MAX_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validation";
import { FormField } from "./form-field";
import { useI18n } from "@/hooks/use-i18n";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      const msg = t("auth.register.passwordTooShort", { count: MIN_PASSWORD_LENGTH });
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = t("auth.register.passwordsMismatch");
      setError(msg);
      toast.error(msg);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? t("auth.register.failed");
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }
      toast.success(t("auth.register.success"));
      router.push("/sign-in");
      return;
    } catch {
      const msg = t("auth.register.failed");
      setError(msg);
      toast.error(msg);
    }
    setPending(false);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="register-email"
          label={t("auth.register.emailLabel")}
          type="email"
          required
          value={email}
          onChange={setEmail}
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
        />
        <FormField
          id="register-password"
          label={t("auth.register.passwordLabel")}
          type="password"
          required
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
        />
        <FormField
          id="register-confirm-password"
          label={t("auth.register.confirmPasswordLabel")}
          type="password"
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
        />
        <FormField
          id="register-name"
          label={t("auth.register.nameOptionalLabel")}
          type="text"
          value={name}
          onChange={setName}
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
        />
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t("auth.register.pending") : t("auth.register.submit")}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("auth.register.signInCta")}
        </Link>
      </p>
    </div>
  );
}
