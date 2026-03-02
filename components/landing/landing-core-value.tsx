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
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          {KEYS.map((key, i) => {
            const Icon = ICONS[i];
            const titleKey = `home.coreValue.${key}.title`;
            const descKey = `home.coreValue.${key}.description`;
            return (
              <div
                key={key}
                className="flex flex-col items-start space-y-4 bg-white p-6 dark:bg-zinc-900"
              >
                <div className="rounded-md bg-indigo-100 p-2 dark:bg-indigo-950/50">
                  <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {translate(language, titleKey)}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
