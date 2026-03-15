"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCROLL_THRESHOLD_PX = 150;

export function LandingGoToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={scrollToTop}
      aria-label="Go to top"
      className={
        "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg border border-[#D4C9B0] bg-[#FDFAF4] hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800 " +
        "transition-all duration-300 ease-out " +
        (visible
          ? "translate-x-0 opacity-100"
          : "translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none")
      }
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
