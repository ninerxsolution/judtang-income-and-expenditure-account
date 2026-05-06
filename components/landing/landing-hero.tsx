"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { translate, type Language } from "@/i18n";

type LandingHeroProps = {
  language: Language;
};

export function LandingHero({ language }: LandingHeroProps) {
  return (
    <section className="relative isolate flex flex-1 items-center overflow-hidden py-12 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.45),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="absolute -bottom-[30rem] left-1/2 h-[54rem] w-[130%] -translate-x-1/2 rounded-[50%] border border-[#7E6D58]/45 bg-[#D8C9BA]/75 dark:border-stone-700 dark:bg-stone-900/70" />
        <div className="absolute -bottom-[29.25rem] left-1/2 h-[53rem] w-[128%] -translate-x-1/2 rounded-[50%] border border-[#F8F2EA]/70" />
        <div className="absolute -left-20 top-12 h-64 w-64 rounded-full bg-[#E6D8CA]/35 dark:bg-stone-800/30" />
        <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#D6C3B1]/35 dark:bg-stone-800/30" />
        <div className="absolute left-[12%] top-[20%] h-6 w-6 rounded-full border border-[#F0A43B]/40 bg-[#F6C36A]/35" />
        <div className="absolute left-[22%] top-[32%] h-3 w-3 rounded-full bg-[#EB9F37]/50" />
        <div className="absolute right-[17%] top-[24%] h-5 w-5 rounded-full border border-[#E5912A]/35 bg-[#F2B95F]/35" />
        <div className="absolute right-[28%] top-[38%] h-2.5 w-2.5 rounded-full bg-[#EAA13F]/45" />
        <div className="absolute right-[12%] bottom-[26%] h-4 w-4 rounded-full border border-[#F3B459]/35 bg-[#F7CB7E]/35" />
        <div className="absolute left-[18%] bottom-[20%] h-40 w-40 rounded-full bg-[#EDA743]/10 dark:bg-[#D7831E]/10" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:gap-16">
          <div className="flex flex-col align-center justify-center text-center space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#3D3020] dark:text-stone-100 sm:text-5xl">
              {translate(language, "home.hero.headline")}
            </h1>
            <p className="text-lg leading-relaxed text-[#6B5E4E] dark:text-stone-400">
              {translate(language, "home.hero.subheadline")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#EEF7EB] hover:bg-[#DDF0D5] text-[#3D3020] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                <Link href="/sign-in">
                  {translate(language, "home.nav.login")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-[#5C6B52] hover:bg-[#4A5E40] text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                <Link href="/register">
                  {translate(language, "home.hero.primaryCta")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
