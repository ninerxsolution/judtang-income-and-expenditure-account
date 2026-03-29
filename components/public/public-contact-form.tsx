"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/auth/form-field";
import { RowSelect } from "@/components/dashboard/row-select";
import { TurnstileCaptcha } from "@/components/common/turnstile-captcha";
import { useI18n } from "@/hooks/use-i18n";
import { useIsLocalhost } from "@/hooks/use-is-localhost";
import { EMAIL_MAX_LENGTH } from "@/lib/validation";

const TOPIC_VALUES = [
  "GENERAL",
  "ACCOUNT_HELP",
  "PRODUCT_FEEDBACK",
  "PARTNERSHIP_OR_PRESS",
  "OTHER",
] as const;

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;
const NAME_MAX = 200;

export function PublicContactForm() {
  const { t, language } = useI18n();
  const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
  const isLocalhost = useIsLocalhost();
  const requiresTurnstile = !!sitekey && !isLocalhost;

  const topicOptions = useMemo(
    () =>
      TOPIC_VALUES.map((value) => ({
        value,
        label: t(`publicContact.topics.${value}`),
      })),
    [t]
  );

  const [topic, setTopic] = useState<string>("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!topic) {
      const msg = t("publicContact.topicPlaceholder");
      setError(msg);
      toast.error(msg);
      return;
    }
    if (requiresTurnstile && !turnstileToken) {
      const msg = t("publicContact.errorVerification");
      setError(msg);
      toast.error(msg);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          topic,
          subject: subject.trim(),
          message: message.trim(),
          language,
          ...(requiresTurnstile && turnstileToken
            ? { turnstileToken }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        const msg =
          data.error ??
          (res.status === 429
            ? t("publicContact.errorRateLimit")
            : t("publicContact.errorGeneric"));
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }
      toast.success(t("publicContact.success"));
      setDone(true);
      setPending(false);
    } catch {
      const msg = t("publicContact.errorGeneric");
      setError(msg);
      toast.error(msg);
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
        {t("publicContact.success")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact-topic">{t("publicContact.topicLabel")}</Label>
        <RowSelect
          id="contact-topic"
          value={topic}
          onChange={setTopic}
          options={topicOptions}
          allowEmpty
          emptyLabel={t("publicContact.topicPlaceholder")}
        />
      </div>
      <FormField
        id="contact-email"
        label={t("publicContact.emailLabel")}
        type="email"
        required
        value={email}
        onChange={setEmail}
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
      />
      <div className="space-y-2">
        <Label htmlFor="contact-name">
          {t("publicContact.nameLabel")}
          <span className="text-muted-foreground ml-1 font-normal">
            ({t("publicContact.nameHint")})
          </span>
        </Label>
        <Input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          autoComplete="name"
          className="border-[#D4C9B0] dark:border-stone-600"
        />
      </div>
      <FormField
        id="contact-subject"
        label={t("publicContact.subjectLabel")}
        type="text"
        required
        value={subject}
        onChange={setSubject}
        maxLength={SUBJECT_MAX}
      />
      <div className="space-y-2">
        <Label htmlFor="contact-message">{t("publicContact.messageLabel")}</Label>
        <Textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          rows={6}
          className="min-h-[120px] border-[#D4C9B0] dark:border-stone-600"
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <TurnstileCaptcha onTokenChange={setTurnstileToken} />
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? t("publicContact.pending") : t("publicContact.submit")}
      </Button>
    </form>
  );
}
