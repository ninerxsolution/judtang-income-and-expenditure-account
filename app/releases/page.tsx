/**
 * Public releases page — changelog for unauthenticated users.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getChangelogVersions,
  type ChangelogVersion,
  type ChangelogSection,
} from "@/lib/changelog";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  translate,
  type Language,
} from "@/i18n";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTION_KEYS: Record<
  string,
  "added" | "changed" | "fixed" | "removed" | "breaking" | "migration"
> = {
  added: "added",
  changed: "changed",
  fixed: "fixed",
  removed: "removed",
  breaking: "breaking",
  migration: "migration",
};

async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  return isSupportedLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  return {
    title: translate(language, "settings.patchNote.title"),
  };
}

function SectionBlock({
  section,
  isBreaking,
  isMigration,
  language,
}: {
  section: ChangelogSection;
  isBreaking: boolean;
  isMigration: boolean;
  language: Language;
}) {
  const labelKey = SECTION_KEYS[section.title.trim().toLowerCase()];
  const headingLabel = labelKey
    ? translate(language, `settings.patchNote.sections.${labelKey}`)
    : section.title;
  const wrapperClass = isBreaking
    ? "bg-red-50/50 p-4 dark:bg-red-950/20"
    : isMigration
      ? ""
      : "";

  return (
    <div className={wrapperClass}>
      <h3
        className={
          isBreaking
            ? "mb-2 text-sm font-semibold text-red-700 dark:text-red-400"
            : isMigration
              ? "mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300"
              : "mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
        }
      >
        {headingLabel}
      </h3>
      <div className="changelog-body text-sm text-zinc-700 dark:text-zinc-300 [&_ul]:list-inside [&_ul]:list-disc [&_ol]:list-inside [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-200 [&_pre]:p-2 [&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 [&_code]:py-0.5 [&_hr]:my-10 [&_hr]:border-zinc-200 dark:[&_pre]:bg-zinc-800 dark:[&_code]:bg-zinc-800 dark:[&_hr]:border-zinc-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body}</ReactMarkdown>
      </div>
    </div>
  );
}

function VersionBlock({
  version,
  language,
}: {
  version: ChangelogVersion;
  language: Language;
}) {
  return (
    <section
      id={`v${version.version}`}
      className="scroll-mt-6 space-y-2"
      aria-labelledby={`version-${version.version}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          id={`version-${version.version}`}
          className="inline-flex items-center rounded-md bg-zinc-900 px-2.5 py-0.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          v{version.version}
        </span>
        <time
          dateTime={version.releaseDate}
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          {version.releaseDate}
        </time>
      </div>
      <div className="grid gap-3">
        {version.sections.map((section) => (
          <SectionBlock
            key={section.title}
            section={section}
            isBreaking={section.title === "Breaking"}
            isMigration={section.title === "Migration"}
            language={language}
          />
        ))}
      </div>
    </section>
  );
}

export default async function ReleasesPage() {
  const language = await getLanguage();
  const versions = await getChangelogVersions(language);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/95 backdrop-blur supports-backdrop-filter:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-backdrop-filter:bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {translate(language, "home.nav.backToHome")}
            </Link>
          </Button>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {translate(language, "settings.patchNote.title")}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <AlertTriangle className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              {translate(language, "settings.patchNote.empty")}
            </p>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
              {translate(language, "settings.patchNote.noReleases")}
            </p>
          </div>
        ) : (
          <div className="">
            {versions.map((version) => (
              <VersionBlock
                key={version.version}
                version={version}
                language={language}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
