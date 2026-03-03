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
    <footer className="border-t border-[#D4C9B0] py-12 dark:border-stone-800">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#6B5E4E] dark:text-stone-400">
            <span>{translate(language, "home.footer.version", { version })}</span>
            <span>{translate(language, "home.footer.techStack")}</span>
            <Link
              href="/releases"
              className="hover:text-[#3D3020] dark:hover:text-stone-100"
            >
              {translate(language, "home.footer.releaseNotes")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[#3D3020] dark:hover:text-stone-100"
            >
              {translate(language, "home.footer.privacyPolicy")}
            </Link>
            <Link
              href="/terms"
              className="hover:text-[#3D3020] dark:hover:text-stone-100"
            >
              {translate(language, "home.footer.termsAndConditions")}
            </Link>
          </div>
          <p className="text-sm text-[#A09080] dark:text-stone-500">
            {translate(language, "home.footer.copyright", { year: String(year) })}
          </p>
        </div>
      </div>
    </footer>
  );
}
