"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_LOCALES, Language, translate, getDictionary, type Dictionary } from "@/i18n";

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: Dictionary & ((key: string, params?: Record<string, string | number>) => string);
};

export const I18nContext = createContext<I18nContextValue>({
  language: DEFAULT_LANGUAGE,
  locale: LANGUAGE_LOCALES[DEFAULT_LANGUAGE],
  setLanguage: () => {},
  t: ((key: string) => key) as I18nContextValue["t"],
});

type I18nProviderProps = {
  initialLanguage: Language;
  children: React.ReactNode;
};

const LANG_COOKIE_NAME = "lang";
const LANG_LOCAL_STORAGE_KEY = "judtang_lang";

export function I18nProvider({ initialLanguage, children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? DEFAULT_LANGUAGE);

  const locale = LANGUAGE_LOCALES[language] ?? LANGUAGE_LOCALES[DEFAULT_LANGUAGE];

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);

    if (typeof document !== "undefined") {
      const cookieValue = `${LANG_COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
      document.cookie = cookieValue;
      try {
        window.localStorage.setItem(LANG_LOCAL_STORAGE_KEY, next);
      } catch {
        // Ignore localStorage errors (e.g. disabled storage)
      }
      document.documentElement.lang = LANGUAGE_LOCALES[next] ?? next;
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // On first mount, allow localStorage to override initial cookie-based language
    try {
      const stored = window.localStorage.getItem(LANG_LOCAL_STORAGE_KEY) as Language | null;
      if (stored && stored !== language) {
        queueMicrotask(() => setLanguage(stored));
        return;
      }
    } catch {
      // Ignore localStorage errors
    }

    document.documentElement.lang = locale;
  }, [language, locale, setLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params);
    },
    [language],
  ) as I18nContextValue["t"];

  // Attach dictionary properties to the function so both patterns work:
  // t("key") for function calls and t.key for object access
  const dict = getDictionary(language);
  Object.assign(t, dict);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale,
      setLanguage,
      t,
    }),
    [language, locale, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

