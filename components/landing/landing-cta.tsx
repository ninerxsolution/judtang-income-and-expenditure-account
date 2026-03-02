"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { translate, type Language } from "@/i18n";

type LandingCtaProps = {
  language: Language;
};

export function LandingCta({ language }: LandingCtaProps) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border border-zinc-200 bg-zinc-100/50 py-16 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {translate(language, "home.cta.headline")}
          </h2>
          <Button
            asChild
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Link href="/register">
              {translate(language, "home.cta.button")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
