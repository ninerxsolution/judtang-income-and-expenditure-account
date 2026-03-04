"use client";

import {
  CreditCard,
  ArrowLeftRight,
  FileSpreadsheet,
  GitBranch,
} from "lucide-react";
import { getDictionary, type Language } from "@/i18n";

type LandingFeatureGridProps = {
  language: Language;
};

const FEATURES = [
  {
    key: "creditCard",
    Icon: CreditCard,
  },
  {
    key: "transfer",
    Icon: ArrowLeftRight,
  },
  {
    key: "importExport",
    Icon: FileSpreadsheet,
  },
  {
    key: "releaseTracking",
    Icon: GitBranch,
  },
] as const;

export function LandingFeatureGrid({ language }: LandingFeatureGridProps) {
  const dict = getDictionary(language);
  const features = dict.home.features;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          {FEATURES.map(({ key, Icon }) => {
            const feature = features[key];
            const items = feature.items as string[];
            return (
              <div
                key={key}
                className="flex flex-col space-y-4 rounded-xl border border-[#D4C9B0] bg-[#FDFAF4] p-6 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-[#EBF4E3] p-2 dark:bg-amber-950/50">
                    <Icon className="h-5 w-5 text-[#5C6B52] dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#3D3020] dark:text-stone-100">
                    {feature.title}
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-[#A09080] dark:text-stone-400">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
