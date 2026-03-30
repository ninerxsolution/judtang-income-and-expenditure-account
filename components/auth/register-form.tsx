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
import { TurnstileCaptcha } from "@/components/common/turnstile-captcha";
import { TermsModal } from "./terms-modal";
import { PrivacyModal } from "./privacy-modal";
import { useI18n } from "@/hooks/use-i18n";
import { useIsLocalhost } from "@/hooks/use-is-localhost";
import { TERMS_VERSION } from "@/lib/terms";

export function RegisterForm() {
  const router = useRouter();
  const { t, language } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
  const isLocalhost = useIsLocalhost();
  const requiresTurnstile = !!sitekey && !isLocalhost;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!agreedToTerms) {
      const msg = t("auth.register.termsRequired");
      setError(msg);
      toast.error(msg);
      return;
    }
    if (requiresTurnstile && !turnstileToken) {
      const msg = t("auth.turnstileRequired");
      setError(msg);
      toast.error(msg);
      return;
    }
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
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name || undefined,
          termsVersion: TERMS_VERSION,
          language,
          ...(requiresTurnstile && { turnstileToken }),
        }),
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
        {/* Terms & Conditions checkbox */}
        <div className="flex items-start gap-2.5">
          <input
            id="register-terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
          />
          <label
            htmlFor="register-terms"
            className="text-sm leading-snug text-muted-foreground"
          >
            {t("auth.register.agreeToTerms")
              .split("{terms}")
              .flatMap((part, i) =>
                i === 0
                  ? [part]
                  : [
                      <button
                        key="terms-link"
                        type="button"
                        onClick={() => setTermsModalOpen(true)}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        {t("auth.register.agreeToTermsTerms")}
                      </button>,
                      ...part.split("{privacy}").flatMap((subPart, j) =>
                        j === 0
                          ? [subPart]
                          : [
                              <button
                                key="privacy-link"
                                type="button"
                                onClick={() => setPrivacyModalOpen(true)}
                                className="font-medium text-primary underline underline-offset-4"
                              >
                                {t("auth.register.agreeToTermsPrivacy")}
                              </button>,
                              subPart,
                            ]
                      ),
                    ]
              )}
          </label>
        </div>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <TurnstileCaptcha onTokenChange={setTurnstileToken} />
        <Button
          type="submit"
          disabled={pending || (requiresTurnstile && !turnstileToken)}
          className="w-full"
        >
          {pending ? t("auth.register.pending") : t("auth.register.submit")}
        </Button>
      </form>

      <TermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
      <PrivacyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />

      <p className="text-center text-muted-foreground text-sm">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("auth.register.signInCta")}
        </Link>
      </p>
    </div>
  );
}
