/**
 * Public contact page — no authentication required.
 */
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  translate,
  type Language,
} from "@/i18n";
import { Button } from "@/components/ui/button";
import { PublicContactForm } from "@/components/public/public-contact-form";

async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  return isSupportedLanguage(langCookie) ? langCookie : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  return {
    title: translate(language, "publicContact.meta.title"),
    description: translate(language, "publicContact.meta.description"),
  };
}

export default async function ContactPage() {
  const language = await getLanguage();

  return (
    <div className="landing-page min-h-screen bg-[#F5F0E8] dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-[#D4C9B0] bg-[#FDFAF4]/95 backdrop-blur supports-backdrop-filter:bg-[#FDFAF4]/80 dark:border-stone-800 dark:bg-stone-950/95 dark:supports-backdrop-filter:bg-stone-950/80">
        <div className="mx-auto flex min-h-[68px] max-w-4xl items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/"
              className="gap-2 text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {translate(language, "privacy.backToHome")}
            </Link>
          </Button>
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-[#3D3020] dark:text-stone-100"
          >
            <Image
              src="/judtang-logo-temp.png"
              alt="Judtang"
              width={32}
              height={32}
              className="rounded-full"
            />
            Judtang
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        <h1 className="text-2xl font-bold text-[#3D3020] dark:text-stone-100">
          {translate(language, "publicContact.title")}
        </h1>
        <p className="mt-2 text-sm text-[#6B5E4E] dark:text-stone-400">
          {translate(language, "publicContact.subtitle")}
        </p>
        <div className="mt-8 rounded-lg border border-[#D4C9B0] bg-[#FDFAF4]/80 p-6 dark:border-stone-700 dark:bg-stone-900/40">
          <PublicContactForm />
        </div>
      </main>
    </div>
  );
}
