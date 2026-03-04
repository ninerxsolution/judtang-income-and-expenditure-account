import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { Analytics } from "@vercel/analytics/next"
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LOCALES,
  isSupportedLanguage,
  translate,
  type Language,
} from "@/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  const language: Language = isSupportedLanguage(langCookie)
    ? langCookie
    : DEFAULT_LANGUAGE;

  return {
    title: {
      default: translate(language, "common.appName"),
      template: `%s | ${translate(language, "common.appName")}`,
    },
    description: translate(language, "common.appDescription"),
  };
}

async function getInitialLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  if (isSupportedLanguage(langCookie)) {
    return langCookie;
  }
  return DEFAULT_LANGUAGE;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getInitialLanguage();
  const locale = LANGUAGE_LOCALES[language] ?? "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Noto+Sans+Thai:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <I18nProvider initialLanguage={language}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SessionProvider>{children}</SessionProvider>
            <Toaster />
          </ThemeProvider>
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
