"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, Globe, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/hooks/use-i18n";
import { translate, type Language } from "@/i18n";

type ThemeValue = "light" | "dark" | "system";

type LandingNavbarProps = {
  language: Language;
};

export function LandingNavbar({ language }: LandingNavbarProps) {
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;
  const { setLanguage, t } = useI18n();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    router.refresh();
  };

  const currentTheme = (theme ?? "system") as ThemeValue;

  const themeLabel =
    currentTheme === "light"
      ? translate(language, "home.nav.themeLight")
      : currentTheme === "dark"
        ? translate(language, "home.nav.themeDark")
        : translate(language, "home.nav.themeSystem");

  const ThemeIcon = currentTheme === "light" ? Sun : currentTheme === "dark" ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-zinc-50/95 backdrop-blur supports-backdrop-filter:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-backdrop-filter:bg-zinc-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Judtang
        </Link>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <ThemeIcon className="h-4 w-4" />
                {themeLabel}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={currentTheme === "light" ? "bg-accent" : ""}
              >
                <Sun className="mr-2 h-4 w-4" />
                {translate(language, "home.nav.themeLight")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={currentTheme === "dark" ? "bg-accent" : ""}
              >
                <Moon className="mr-2 h-4 w-4" />
                {translate(language, "home.nav.themeDark")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("system")}
                className={currentTheme === "system" ? "bg-accent" : ""}
              >
                <Monitor className="mr-2 h-4 w-4" />
                {translate(language, "home.nav.themeSystem")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <Globe className="h-4 w-4" />
                {language === "th"
                  ? t("settings.language.optionThai")
                  : t("settings.language.optionEnglish")}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleLanguageChange("th")}
                className={language === "th" ? "bg-accent" : ""}
              >
                {t("settings.language.optionThai")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLanguageChange("en")}
                className={language === "en" ? "bg-accent" : ""}
              >
                {t("settings.language.optionEnglish")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/releases"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {translate(language, "home.nav.releases")}
          </Link>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              GitHub
            </a>
          )}
          <Link
            href="/sign-in"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {translate(language, "home.nav.login")}
          </Link>
          <Button
            asChild
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Link href="/register">
              {translate(language, "home.nav.getStarted")}
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
