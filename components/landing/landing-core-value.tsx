"use client";

import { Calculator, Wallet, Hash } from "lucide-react";
import { translate, type Language } from "@/i18n";

type LandingCoreValueProps = {
  language: Language;
};

const ICONS = [Calculator, Wallet, Hash] as const;
const KEYS = ["structured", "multiAccount", "deterministic"] as const;

export function LandingCoreValue({ language }: LandingCoreValueProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {KEYS.map((key, i) => {
            const Icon = ICONS[i];
            const titleKey = `home.coreValue.${key}.title`;
            const descKey = `home.coreValue.${key}.description`;
            return (
              <div
                key={key}
                className="flex flex-col items-start space-y-4 rounded-xl border border-[#D4C9B0] bg-[#FDFAF4] p-6 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="rounded-md bg-[#EBF4E3] p-2 dark:bg-amber-950/50">
                  <Icon className="h-5 w-5 text-[#5C6B52] dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#3D3020] dark:text-stone-100">
                  {translate(language, titleKey)}
                </h3>
                <p className="text-sm leading-relaxed text-[#A09080] dark:text-stone-400">
                  {translate(language, descKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
