/**
 * Public Privacy Policy page — accessible without authentication.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  translate,
  getDictionary,
  type Language,
} from "@/i18n";
import { Button } from "@/components/ui/button";

async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  return isSupportedLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  return {
    title: translate(language, "privacy.meta.title"),
    description: translate(language, "privacy.meta.description"),
  };
}

function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-20" />;
}

export default async function PrivacyPage() {
  const language = await getLanguage();
  const dict = getDictionary(language);
  const p = dict.privacy;

  const bodyLines = (text: string) =>
    text.split("\n\n").map((paragraph, i) => (
      <p key={i} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {paragraph}
      </p>
    ));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/95 backdrop-blur supports-backdrop-filter:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-backdrop-filter:bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {p.backToHome}
            </Link>
          </Button>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {p.title}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Page title & version */}
        <div className="mb-10 space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {p.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center rounded-md bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              {p.version}
            </span>
            <span>{p.effectiveDate}</span>
          </div>
        </div>

        <div className="space-y-10">
          {/* 1. Introduction */}
          <section aria-labelledby="s-introduction">
            <SectionAnchor id="introduction" />
            <h2
              id="s-introduction"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.introduction.title}
            </h2>
            <div className="space-y-3">
              {bodyLines(p.sections.introduction.body)}
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section aria-labelledby="s-data-collected">
            <SectionAnchor id="data-collected" />
            <h2
              id="s-data-collected"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.dataCollected.title}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.dataCollected.intro}
            </p>
            <div className="space-y-4">
              {p.sections.dataCollected.categories.map((cat) => (
                <div key={cat.heading}>
                  <h3 className="mb-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {cat.heading}
                  </h3>
                  <ul className="space-y-1 pl-4">
                    {cat.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Not collected */}
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
              <div className="mb-2 flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {p.sections.dataCollected.notCollected.title}
                </h3>
              </div>
              <p className="mb-3 text-sm text-red-700/80 dark:text-red-400/80">
                {p.sections.dataCollected.notCollected.intro}
              </p>
              <ul className="space-y-1 pl-4">
                {p.sections.dataCollected.notCollected.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 dark:bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 3. How We Use Information */}
          <section aria-labelledby="s-data-use">
            <SectionAnchor id="data-use" />
            <h2
              id="s-data-use"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.dataUse.title}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.dataUse.intro}
            </p>
            <ul className="space-y-1.5 pl-4">
              {p.sections.dataUse.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 4. Data Storage & Security */}
          <section aria-labelledby="s-security">
            <SectionAnchor id="security" />
            <h2
              id="s-security"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.security.title}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.security.intro}
            </p>
            <ul className="mb-4 space-y-1.5 pl-4">
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
            <p className="text-sm italic leading-relaxed text-zinc-500 dark:text-zinc-500">
              {p.sections.security.note}
            </p>
          </section>

          {/* 5. Third-Party Services */}
          <section aria-labelledby="s-third-party">
            <SectionAnchor id="third-party" />
            <h2
              id="s-third-party"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.thirdParty.title}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.thirdParty.intro}
            </p>
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
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
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {provider.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {provider.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm italic leading-relaxed text-zinc-500 dark:text-zinc-500">
              {p.sections.thirdParty.note}
            </p>
          </section>

          {/* 6. Data Retention */}
          <section aria-labelledby="s-retention">
            <SectionAnchor id="retention" />
            <h2
              id="s-retention"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.retention.title}
            </h2>
            <div className="space-y-3">
              {bodyLines(p.sections.retention.body)}
            </div>
          </section>

          {/* 7. Your Rights */}
          <section aria-labelledby="s-rights">
            <SectionAnchor id="rights" />
            <h2
              id="s-rights"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.rights.title}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.rights.intro}
            </p>
            <ul className="mb-4 space-y-1.5 pl-4">
              {p.sections.rights.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm italic leading-relaxed text-zinc-500 dark:text-zinc-500">
              {p.sections.rights.note}
            </p>
          </section>

          {/* 8. Account Deletion */}
          <section aria-labelledby="s-deletion">
            <SectionAnchor id="deletion" />
            <h2
              id="s-deletion"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.deletion.title}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.deletion.body}
            </p>
            <h3 className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {p.sections.deletion.removesTitle}
            </h3>
            <ul className="mb-3 space-y-1.5 pl-4">
              {p.sections.deletion.removes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm italic leading-relaxed text-zinc-500 dark:text-zinc-500">
              {p.sections.deletion.backupNote}
            </p>
          </section>

          {/* 9. Changes to This Policy */}
          <section aria-labelledby="s-changes">
            <SectionAnchor id="changes" />
            <h2
              id="s-changes"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.changes.title}
            </h2>
            <div className="space-y-3">{bodyLines(p.sections.changes.body)}</div>
          </section>

          {/* 10. Contact Information */}
          <section aria-labelledby="s-contact">
            <SectionAnchor id="contact" />
            <h2
              id="s-contact"
              className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {p.sections.contact.title}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {p.sections.contact.body}
            </p>
          </section>
        </div>

        {/* Footer note */}
        <div className="mt-14 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            {p.lastUpdated}
          </p>
        </div>
      </main>
    </div>
  );
}
