"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/auth/form-field";
import { TurnstileCaptcha } from "@/components/common/turnstile-captcha";
import { useI18n } from "@/hooks/use-i18n";
import { useIsLocalhost } from "@/hooks/use-is-localhost";

const CATEGORIES = [
  { value: "BUG", key: "categoryBug" },
  { value: "CALCULATION_ISSUE", key: "categoryCalculation" },
  { value: "DATA_MISMATCH", key: "categoryDataMismatch" },
  { value: "UI_ISSUE", key: "categoryUiIssue" },
  { value: "FEATURE_REQUEST", key: "categoryFeatureRequest" },
  { value: "OTHER", key: "categoryOther" },
] as const;

const TITLE_MIN = 5;
const TITLE_MAX = 200;
const DESC_MIN = 10;
const DESC_MAX = 5000;
const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function FeedbackPage() {
  const { t, language } = useI18n();
  const isLocalhost = useIsLocalhost();
  const sitekey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
  const requiresTurnstile = !!sitekey && !isLocalhost;

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) continue;
      const type = f.type;
      if (
        type === "image/jpeg" ||
        type === "image/png" ||
        type === "image/webp"
      ) {
        valid.push(f);
      }
    }
    setImageFiles((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!category) {
      const msg = t("settings.feedback.categoryPlaceholder");
      setError(msg);
      toast.error(msg);
      return;
    }
    if (title.trim().length < TITLE_MIN || title.trim().length > TITLE_MAX) {
      setError(t("settings.feedback.titlePlaceholder"));
      toast.error(t("settings.feedback.titlePlaceholder"));
      return;
    }
    if (
      description.trim().length < DESC_MIN ||
      description.trim().length > DESC_MAX
    ) {
      setError(t("settings.feedback.descriptionPlaceholder"));
      toast.error(t("settings.feedback.descriptionPlaceholder"));
      return;
    }
    if (requiresTurnstile && !turnstileToken) {
      const msg = t("settings.feedback.errorVerification");
      setError(msg);
      toast.error(msg);
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("category", category);
      formData.set("title", title.trim());
      formData.set("description", description.trim());
      formData.set("language", language);
      if (requiresTurnstile && turnstileToken) {
        formData.set("turnstileToken", turnstileToken);
      }
      for (const file of imageFiles) {
        formData.append("images", file);
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data.error ??
          (res.status === 429
            ? t("settings.feedback.errorRateLimit")
            : t("settings.feedback.error"));
        setError(msg);
        toast.error(msg);
        setPending(false);
        return;
      }

      toast.success(t("settings.feedback.success"));
      setCategory("");
      setTitle("");
      setDescription("");
      setImageFiles([]);
      setTurnstileToken(null);
      setPending(false);
    } catch {
      setError(t("settings.feedback.error"));
      toast.error(t("settings.feedback.error"));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">
          {t("settings.feedback.title")}
        </h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {t("settings.feedback.description")}
        </p>
      </header>

      <div className="rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
              {t("settings.feedback.formTitle")}
            </h2>
            <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
              {t("settings.feedback.formDescription")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">{t("settings.feedback.categoryLabel")}</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="h-9 w-full rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <option value="">{t("settings.feedback.categoryPlaceholder")}</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(`settings.feedback.${c.key}`)}
                </option>
              ))}
            </select>
          </div>

          <FormField
            id="title"
            label={t("settings.feedback.titleLabel")}
            value={title}
            onChange={setTitle}
            placeholder={t("settings.feedback.titlePlaceholder")}
            maxLength={TITLE_MAX}
          />

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("settings.feedback.descriptionLabel")}
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              maxLength={DESC_MAX}
              placeholder={t("settings.feedback.descriptionPlaceholder")}
              className="w-full rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("settings.feedback.screenshotsLabel")}</Label>
            <p className="text-xs text-[#A09080] dark:text-stone-400">
              {t("settings.feedback.screenshotsHint")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="max-w-xs rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-[#F5F0E8] file:px-3 file:py-1 file:text-sm dark:border-stone-700 dark:bg-stone-900 dark:file:bg-stone-800"
            />
            {imageFiles.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {imageFiles.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded border border-[#D4C9B0] bg-[#FDFAF4] px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                  >
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="text-red-600 hover:underline"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <TurnstileCaptcha onTokenChange={setTurnstileToken} />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? t("settings.feedback.submitting") : t("settings.feedback.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
