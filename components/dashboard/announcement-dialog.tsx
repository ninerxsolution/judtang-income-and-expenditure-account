"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import type { Announcement } from "@/lib/announcement";
import { resolveLocalized } from "@/lib/announcement";

const DISMISSED_KEY_PREFIX = "announcement.dismissed.";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function shouldSkip(id: string, showOnce: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(DISMISSED_KEY_PREFIX + id);
    if (!stored) return false;
    if (showOnce && stored === "1") return true;
    if (stored === getTodayString()) return true;
    return false;
  } catch {
    return false;
  }
}

function saveDismissed(id: string, permanent: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISSED_KEY_PREFIX + id,
      permanent ? "1" : getTodayString()
    );
  } catch {
    // ignore
  }
}

export function AnnouncementDialog() {
  const pathname = usePathname();
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [imageError, setImageError] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  const enabled = process.env.NEXT_PUBLIC_ANNOUNCEMENT_ENABLED === "true";
  const isHomePage = pathname === "/";

  useEffect(() => {
    if (!enabled || !isHomePage) return;

    void (async () => {
      try {
        const res = await fetch("/api/announcement");
        if (!res.ok) return;
        const data: Announcement | null = (await res.json()) as Announcement | null;
        if (!data) return;

        if (shouldSkip(data.id, data.show_once)) return;

        setAnnouncement(data);
        setOpen(true);
      } catch {
        // ignore — no announcement shown on error
      }
    })();
  // Only run once on mount for the home page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    if (!announcement) return;
    if (announcement.show_once) {
      saveDismissed(announcement.id, true);
    } else if (dontShowToday) {
      saveDismissed(announcement.id, false);
    }
    setOpen(false);
  }

  if (!announcement) return null;

  const lang = language === "th" ? "th" : "en";
  const resolvedTitle = resolveLocalized(announcement.title, lang);
  const resolvedContent = resolveLocalized(announcement.content, lang);
  const resolvedImageAlt = resolveLocalized(announcement.image_alt, lang) || resolvedTitle;
  const resolvedActionLabel = resolveLocalized(announcement.action_label, lang);

  const hasContent = Boolean(resolvedContent);
  const hasCta = Boolean(announcement.action_url) && Boolean(resolvedActionLabel);
  const showDontShowCheckbox = announcement.dismissible && !announcement.show_once;
  const dontShowLabel = language === "th" ? "ไม่ต้องแสดงอีกในวันนี้" : "Don't show again today";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && announcement.dismissible) {
          handleDismiss();
        } else if (!next && !announcement.dismissible) {
          // prevent closing via Escape / overlay click when not dismissible
        } else {
          setOpen(next);
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden border-0 shadow-2xl w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-900"
        onInteractOutside={(e) => {
          if (!announcement.dismissible) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!announcement.dismissible) {
            e.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">{resolvedTitle}</DialogTitle>
        <div className="relative w-full">
          {/* Close button */}
          {announcement.dismissible && (
            <DialogClose asChild>
              <button
                aria-label="Close announcement"
                onClick={handleDismiss}
                className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          )}

          {/* Image */}
          {!imageError ? (
            <div className="relative w-full aspect-4/3 bg-zinc-900">
              <Image
                src={announcement.image}
                alt={resolvedImageAlt}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized={announcement.image.startsWith("http")}
              />
            </div>
          ) : (
            <div className="relative w-full aspect-4/3 bg-zinc-800 flex items-center justify-center">
              <span className="text-sm text-zinc-400">{resolvedTitle}</span>
            </div>
          )}

          {/* Bottom overlay — always shown when content, CTA, or checkbox exists */}
          {(hasContent || hasCta || showDontShowCheckbox) && (
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-linear-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-12">
              {hasContent && (
                <p className="text-sm text-white/90 leading-snug mb-2">
                  {resolvedContent}
                </p>
              )}
              {hasCta && (
                <Link
                  href={announcement.action_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow hover:bg-zinc-100 transition-colors mb-3"
                >
                  {resolvedActionLabel}
                </Link>
              )}
              {showDontShowCheckbox && (
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id="announcement-dont-show-today"
                    checked={dontShowToday}
                    onCheckedChange={(checked) => setDontShowToday(checked === true)}
                    className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-zinc-900"
                  />
                  <Label
                    htmlFor="announcement-dont-show-today"
                    className="text-xs text-white/70 cursor-pointer select-none"
                  >
                    {dontShowLabel}
                  </Label>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
