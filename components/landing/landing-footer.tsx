"use client";

import Link from "next/link";
import { translate, type Language } from "@/i18n";

type LandingFooterProps = {
  language: Language;
  version: string;
};

export function LandingFooter({ language, version }: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 py-12 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{translate(language, "home.footer.version", { version })}</span>
            <span>{translate(language, "home.footer.techStack")}</span>
            <Link
              href="/releases"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {translate(language, "home.footer.releaseNotes")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {translate(language, "home.footer.privacyPolicy")}
            </Link>
            <Link
              href="/terms"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {translate(language, "home.footer.termsAndConditions")}
            </Link>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {translate(language, "home.footer.copyright", { year: String(year) })}
          </p>
        </div>
      </div>
    </footer>
  );
}
