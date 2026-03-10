"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const ariaLabel = t("common.aria.toggleTheme");

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-full", className)}
        aria-label={ariaLabel}
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const current = resolvedTheme ?? theme;
  const isDark = current === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 rounded-full", className)}
      aria-label={ariaLabel}
      onClick={toggleTheme}
    >
      <span className="relative inline-flex h-4 w-4" aria-hidden>
        <Sun
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-200",
            isDark
              ? "rotate-0 opacity-100"
              : "rotate-180 opacity-0 pointer-events-none"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-200",
            isDark
              ? "-rotate-180 opacity-0 pointer-events-none"
              : "rotate-0 opacity-100"
          )}
        />
      </span>
    </Button>
  );
}

