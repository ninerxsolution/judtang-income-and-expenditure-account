import { DEFAULT_LANGUAGE, Language, LANGUAGE_LOCALES, SUPPORTED_LANGUAGES, isSupportedLanguage } from "./config";
import { enDictionary } from "./dictionaries/en";
import { thDictionary } from "./dictionaries/th";

const dictionaries = {
  en: enDictionary,
  th: thDictionary,
} as const;

export type Dictionary = (typeof dictionaries)[Language];

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
}

function resolvePath(path: string, dict: Dictionary): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (acc as any)[key];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => {
    const value = String(params[key]);
    return acc.replace(new RegExp(`{${key}}`, "g"), value);
  }, template);
}

export function translate(
  language: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = getDictionary(language);
  const value = resolvePath(key, dict);
  if (typeof value === "string") {
    return interpolate(value, params);
  }
  // Fallback to key so missing translations are visible during development.
  return key;
}

export { DEFAULT_LANGUAGE, LANGUAGE_LOCALES, SUPPORTED_LANGUAGES, isSupportedLanguage };
export type { Language };

