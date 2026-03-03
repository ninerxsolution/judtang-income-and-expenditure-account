/**
 * Public Terms & Conditions page — accessible without authentication.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  translate,
  getDictionary,
  type Language,
} from "@/i18n";
import { Button } from "@/components/ui/button";
import { TERMS_VERSION } from "@/lib/terms";

async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  return isSupportedLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  return {
    title: translate(language, "terms.meta.title"),
    description: translate(language, "terms.meta.description"),
  };
}

function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-20" />;
}

export default async function TermsPage() {
  const language = await getLanguage();
  const dict = getDictionary(language);
  const t = dict.terms;

  const bodyLines = (text: string) =>
    text.split("\n\n").map((paragraph, i) => (
      <p key={i} className="text-sm leading-relaxed text-[#6B5E4E] dark:text-stone-400">
        {paragraph}
      </p>
    ));

  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="space-y-1.5 pl-4">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-sm text-[#6B5E4E] dark:text-stone-400"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="landing-page min-h-screen bg-[#F5F0E8] dark:bg-stone-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-[#D4C9B0] bg-[#FDFAF4]/95 backdrop-blur supports-backdrop-filter:bg-[#FDFAF4]/80 dark:border-stone-800 dark:bg-stone-950/95 dark:supports-backdrop-filter:bg-stone-950/80">
        <div className="mx-auto flex min-h-[68px] max-w-4xl items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-2 text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100">
              <ArrowLeft className="h-4 w-4" />
              {t.backToHome}
            </Link>
          </Button>
          <span className="text-sm font-medium text-[#6B5E4E] dark:text-stone-400">
            {t.title}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Page title & version */}
        <div className="mb-10 space-y-2">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#5C6B52] dark:text-stone-300" />
            <h1 className="text-2xl font-bold text-[#3D3020] dark:text-stone-100">
              {t.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#A09080] dark:text-stone-400">
            <span className="inline-flex items-center rounded-md bg-[#5C6B52] px-2.5 py-0.5 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900">
              {translate(language, "terms.version", { version: TERMS_VERSION })}
            </span>
            <span>{t.effectiveDate}</span>
          </div>
        </div>

        <div className="space-y-10">
          {/* 1. Acceptance of Terms */}
          <section aria-labelledby="s-acceptance">
            <SectionAnchor id="acceptance" />
            <h2
              id="s-acceptance"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.acceptance.title}
            </h2>
            <div className="space-y-3">
              {bodyLines(t.sections.acceptance.body)}
            </div>
          </section>

          {/* 2. Description of Service */}
          <section aria-labelledby="s-service">
            <SectionAnchor id="service" />
            <h2
              id="s-service"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.serviceDescription.title}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-[#6B5E4E] dark:text-stone-400">
              {t.sections.serviceDescription.body}
            </p>
            <BulletList items={t.sections.serviceDescription.clarifications} />
          </section>

          {/* 3. User Responsibilities */}
          <section aria-labelledby="s-responsibilities">
            <SectionAnchor id="responsibilities" />
            <h2
              id="s-responsibilities"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.userResponsibilities.title}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-[#6B5E4E] dark:text-stone-400">
              {t.sections.userResponsibilities.intro}
            </p>
            <BulletList items={t.sections.userResponsibilities.items} />
          </section>

          {/* 4. Limitation of Liability */}
          <section aria-labelledby="s-liability">
            <SectionAnchor id="liability" />
            <h2
              id="s-liability"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.liability.title}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-[#6B5E4E] dark:text-stone-400">
              {t.sections.liability.intro}
            </p>
            <ul className="mb-4 space-y-1.5 pl-4">
              {t.sections.liability.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-[#6B5E4E] dark:text-stone-400"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-[#C49A3C]/40 bg-[#C49A3C]/10 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C49A3C] dark:text-amber-400" />
                <p className="text-sm leading-relaxed text-[#8B7355] dark:text-amber-400">
                  {t.sections.liability.note}
                </p>
              </div>
            </div>
          </section>

          {/* 5. Account Termination */}
          <section aria-labelledby="s-termination">
            <SectionAnchor id="termination" />
            <h2
              id="s-termination"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.termination.title}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-[#3D3020] dark:text-stone-200">
                  {t.sections.termination.providerRights.title}
                </h3>
                <BulletList items={t.sections.termination.providerRights.items} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-[#3D3020] dark:text-stone-200">
                  {t.sections.termination.userRights.title}
                </h3>
                <BulletList items={t.sections.termination.userRights.items} />
              </div>
            </div>
          </section>

          {/* 6. Intellectual Property */}
          <section aria-labelledby="s-ip">
            <SectionAnchor id="intellectual-property" />
            <h2
              id="s-ip"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.intellectualProperty.title}
            </h2>
            <div className="space-y-3">
              {bodyLines(t.sections.intellectualProperty.body)}
            </div>
          </section>

          {/* 7. Changes to Terms */}
          <section aria-labelledby="s-changes">
            <SectionAnchor id="changes" />
            <h2
              id="s-changes"
              className="mb-3 text-base font-semibold text-[#3D3020] dark:text-stone-100"
            >
              {t.sections.changes.title}
            </h2>
            <div className="space-y-3">{bodyLines(t.sections.changes.body)}</div>
          </section>
        </div>

        {/* Footer note */}
        <div className="mt-14 border-t border-[#D4C9B0] pt-6 dark:border-stone-800">
          <p className="text-xs text-[#A09080] dark:text-stone-600">
            {t.lastUpdated}
          </p>
        </div>
      </main>
    </div>
  );
}
