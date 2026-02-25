export const SUPPORTED_LANGUAGES = ["en", "th"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "th";

export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: "en-US",
  th: "th-TH",
};

export function isSupportedLanguage(value: string | undefined | null): value is Language {
  if (!value) return false;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

