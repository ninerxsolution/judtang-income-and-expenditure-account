"use client";

import { Cpu } from "lucide-react";
import { translate, getDictionary, type Language } from "@/i18n";

type LandingEngineProps = {
  language: Language;
};

export function LandingEngine({ language }: LandingEngineProps) {
  const dict = getDictionary(language);
  const bullets = dict.home.engine.bullets as string[];

  return (
    <section id="engine" className="scroll-mt-24 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 md:p-12">
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-indigo-100 p-2 dark:bg-indigo-950/50">
              <Cpu className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 space-y-4">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {translate(language, "home.engine.title")}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {translate(language, "home.engine.description")}
              </p>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
