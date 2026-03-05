"use client";

import { BulletList } from "@/components/ui/bullet-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { getDictionary } from "@/i18n";

interface PrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyModal({ open, onOpenChange }: PrivacyModalProps) {
  const { language } = useI18n();
  const dict = getDictionary(language);
  const p = dict.privacy;

  const bodyLines = (text: string) =>
    text.split("\n\n").map((paragraph, i) => (
      <p key={i} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {paragraph}
      </p>
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
        <DialogHeader className="shrink-0">
          <DialogTitle>{p.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              {p.version}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {p.effectiveDate}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-8 py-2">
            {/* 1. Introduction */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.introduction.title}
              </h3>
              <div className="space-y-2">
                {bodyLines(p.sections.introduction.body)}
              </div>
            </section>

            {/* 2. Information We Collect */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.dataCollected.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.dataCollected.intro}
              </p>
              <div className="space-y-3">
                {p.sections.dataCollected.categories.map((cat) => (
                  <div key={cat.heading}>
                    <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {cat.heading}
                    </p>
                    <BulletList items={cat.items} />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="mb-1.5 flex items-center gap-2">
                  <ShieldOff className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {p.sections.dataCollected.notCollected.title}
                  </p>
                </div>
                <p className="mb-2 text-xs text-red-700/80 dark:text-red-400/80">
                  {p.sections.dataCollected.notCollected.intro}
                </p>
                <BulletList items={p.sections.dataCollected.notCollected.items} />
              </div>
            </section>

            {/* 3. How We Use Information */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.dataUse.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.dataUse.intro}
              </p>
              <BulletList items={p.sections.dataUse.items} />
            </section>

            {/* 4. Data Storage & Security */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.security.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.security.intro}
              </p>
              <ul className="mb-3 space-y-1.5 pl-4">
                {p.sections.security.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic leading-relaxed text-zinc-500 dark:text-zinc-500">
                {p.sections.security.note}
              </p>
            </section>

            {/* 5. Third-Party Services */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.thirdParty.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.thirdParty.intro}
              </p>
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-xs">
                  <tbody>
                    {p.sections.thirdParty.providers.map((provider, index) => (
                      <tr
                        key={provider.name}
                        className={
                          index < p.sections.thirdParty.providers.length - 1
                            ? "border-b border-zinc-200 dark:border-zinc-800"
                            : ""
                        }
                      >
                        <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                          {provider.name}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          {provider.purpose}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs italic leading-relaxed text-zinc-500 dark:text-zinc-500">
                {p.sections.thirdParty.note}
              </p>
            </section>

            {/* 6. Data Retention */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.retention.title}
              </h3>
              <div className="space-y-2">
                {bodyLines(p.sections.retention.body)}
              </div>
            </section>

            {/* 7. Your Rights */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.rights.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.rights.intro}
              </p>
              <BulletList items={p.sections.rights.items} />
              <p className="mt-3 text-xs italic leading-relaxed text-zinc-500 dark:text-zinc-500">
                {p.sections.rights.note}
              </p>
            </section>

            {/* 8. Account Deletion */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.deletion.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.deletion.body}
              </p>
              <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {p.sections.deletion.removesTitle}
              </p>
              <BulletList items={p.sections.deletion.removes} />
              <p className="mt-3 text-xs italic leading-relaxed text-zinc-500 dark:text-zinc-500">
                {p.sections.deletion.backupNote}
              </p>
            </section>

            {/* 9. Changes */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.changes.title}
              </h3>
              <div className="space-y-2">
                {bodyLines(p.sections.changes.body)}
              </div>
            </section>

            {/* 10. Contact */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {p.sections.contact.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.sections.contact.body}
              </p>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
