"use client";

import Link from "next/link";
import Image from "next/image";
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

  const ThemeIcon = currentTheme === "light" ? Sun : currentTheme === "dark" ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-50 border-b border-[#D4C9B0] bg-[#FDFAF4]/95 backdrop-blur supports-backdrop-filter:bg-[#FDFAF4]/80 dark:border-stone-800 dark:bg-stone-950/95 dark:supports-backdrop-filter:bg-stone-950/80">
      <nav className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between px-2 sm:px-6 py-2 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-[#3D3020] dark:text-stone-100"
        >
          <Image
            src="/judtang-logo-temp.png"
            alt="Judtang"
            width={36}
            height={36}
            className="rounded-full"
          />
          Judtang
        </Link>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
              >
                <ThemeIcon className="h-4 w-4" />
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
                className="gap-1.5 text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
              >
                <Globe className="h-4 w-4" />
                {/* {language === "th"
                  ? t("settings.language.optionThai")
                  : t("settings.language.optionEnglish")} */}
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
          
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
            >
              GitHub
            </a>
          )}
          <Link
            href="/sign-in"
            className="hidden sm:block text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
          >
            {translate(language, "home.nav.login")}
          </Link>
          <Button
            asChild
            size="sm"
            className="hidden sm:flex bg-[#5C6B52] hover:bg-[#4A5E40] text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
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
