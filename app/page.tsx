/**
 * Home (public). Product landing page for Judtang Financial Engine.
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  translate,
  type Language,
} from "@/i18n";
import { getChangelogVersions } from "@/lib/changelog";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingGoToTop } from "@/components/landing/landing-go-to-top";
import { LandingPublicShell } from "@/components/landing/landing-public-shell";

async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  return isSupportedLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  return {
    title: translate(language, "home.title"),
    description: translate(language, "home.hero.subheadline"),
  };
}

export default async function Home() {
  const language = await getLanguage();
  const versions = await getChangelogVersions(language);
  const latestVersion = versions[0]?.version ?? "0.0.0";

  return (
    <LandingPublicShell>
      <LandingNavbar language={language} />
      <main className="flex flex-1 flex-col">
        <LandingHero language={language} />
        <LandingFooter language={language} version={latestVersion} />
      </main>
      <LandingGoToTop />
    </LandingPublicShell>
  );
}
