"use client";

import { BulletList } from "@/components/ui/bullet-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { getDictionary } from "@/i18n";
import { TERMS_VERSION } from "@/lib/terms";

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  const { language } = useI18n();
  const dict = getDictionary(language);
  const t = dict.terms;

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
          <DialogTitle>{t.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              v{TERMS_VERSION}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.effectiveDate}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-8 py-2">
            {/* 1. Acceptance */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.acceptance.title}
              </h3>
              <div className="space-y-2">
                {bodyLines(t.sections.acceptance.body)}
              </div>
            </section>

            {/* 2. Service Description */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.serviceDescription.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t.sections.serviceDescription.body}
              </p>
              <BulletList items={t.sections.serviceDescription.clarifications} />
            </section>

            {/* 3. User Responsibilities */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.userResponsibilities.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t.sections.userResponsibilities.intro}
              </p>
              <BulletList items={t.sections.userResponsibilities.items} />
            </section>

            {/* 4. Limitation of Liability */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.liability.title}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t.sections.liability.intro}
              </p>
              <BulletList items={t.sections.liability.items} />
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    {t.sections.liability.note}
                  </p>
                </div>
              </div>
            </section>

            {/* 5. Termination */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.termination.title}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.sections.termination.providerRights.title}
                  </p>
                  <BulletList items={t.sections.termination.providerRights.items} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.sections.termination.userRights.title}
                  </p>
                  <BulletList items={t.sections.termination.userRights.items} />
                </div>
              </div>
            </section>

            {/* 6. Intellectual Property */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.intellectualProperty.title}
              </h3>
              <div className="space-y-2">
                {bodyLines(t.sections.intellectualProperty.body)}
              </div>
            </section>

            {/* 7. Changes */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.sections.changes.title}
              </h3>
              <div className="space-y-2">
                {bodyLines(t.sections.changes.body)}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
