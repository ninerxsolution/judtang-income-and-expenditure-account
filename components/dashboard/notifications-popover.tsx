"use client";

import {
  Bell,
  CheckCheck,
  MoreVertical,
  Receipt,
  Upload,
  CreditCard,
  RepeatIcon,
  CalendarClock,
  PieChart,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types — mirrors API response shape
// ---------------------------------------------------------------------------

type NotificationItem = {
  id: string;
  type: string;
  payload: Record<string, string | number | boolean | null | undefined> | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  kind: "persisted" | "virtual";
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

const DISMISSED_VIRTUAL_IDS_KEY = "notification.dismissedVirtualIds";

function getDismissedVirtualIdsFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_VIRTUAL_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveDismissedVirtualIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_VIRTUAL_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIcon(type: string) {
  switch (type) {
    case "EVENT_SLIP_DONE":
      return Receipt;
    case "EVENT_IMPORT_DONE":
      return Upload;
    case "EVENT_CARD_PAYMENT":
      return CreditCard;
    case "ALERT_RECURRING_DUE":
      return RepeatIcon;
    case "ALERT_CARD_DUE":
      return CalendarClock;
    case "ALERT_BUDGET":
      return PieChart;
    case "ALERT_INCOMPLETE_ACCOUNT":
      return AlertTriangle;
    default:
      return Bell;
  }
}

function formatRelativeTime(dateStr: string, t: ReturnType<typeof useI18n>["t"]): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return t("common.time.justNow");
  if (diffMins < 60) return t("common.time.minutesAgo").replace("{count}", String(diffMins));
  if (diffHours < 24) return t("common.time.hoursAgo").replace("{count}", String(diffHours));
  return t("common.time.daysAgo").replace("{count}", String(diffDays));
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function useNotificationBody(
  item: NotificationItem,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const p = item.payload ?? {};
  switch (item.type) {
    case "EVENT_SLIP_DONE": {
      if (p.hasErrors) {
        return t("notifications.types.EVENT_SLIP_DONE_body_partial")
          .replace("{createdCount}", String(p.createdCount ?? 0))
          .replace("{totalCount}", String(p.totalCount ?? 0));
      }
      return t("notifications.types.EVENT_SLIP_DONE_body").replace(
        "{createdCount}",
        String(p.createdCount ?? 0),
      );
    }
    case "EVENT_IMPORT_DONE":
      return t("notifications.types.EVENT_IMPORT_DONE_body")
        .replace("{createdCount}", String(p.createdCount ?? 0))
        .replace("{updatedCount}", String(p.updatedCount ?? 0))
        .replace("{totalRows}", String(p.totalRows ?? 0));
    case "EVENT_CARD_PAYMENT":
      return t("notifications.types.EVENT_CARD_PAYMENT_body")
        .replace("{amount}", formatAmount(Number(p.amount ?? 0)))
        .replace("{accountName}", String(p.accountName ?? ""));
    case "ALERT_RECURRING_DUE":
      return t("notifications.types.ALERT_RECURRING_DUE_body").replace(
        "{count}",
        String(p.count ?? 0),
      );
    case "ALERT_CARD_DUE": {
      const days = Number(p.daysRemaining ?? 0);
      if (days < 0) {
        return t("notifications.types.ALERT_CARD_DUE_body_overdue").replace(
          "{accountName}",
          String(p.accountName ?? ""),
        );
      }
      if (days === 0) {
        return t("notifications.types.ALERT_CARD_DUE_body_today").replace(
          "{accountName}",
          String(p.accountName ?? ""),
        );
      }
      return t("notifications.types.ALERT_CARD_DUE_body")
        .replace("{accountName}", String(p.accountName ?? ""))
        .replace("{daysRemaining}", String(days));
    }
    case "ALERT_BUDGET": {
      const label = p.categoryName
        ? String(p.categoryName)
        : t("notifications.types.ALERT_BUDGET_label_total");
      const pct = Math.round(Number(p.progress ?? 0) * 100);
      if (p.isOver) {
        return t("notifications.types.ALERT_BUDGET_body_over").replace("{label}", label);
      }
      return t("notifications.types.ALERT_BUDGET_body_near")
        .replace("{label}", label)
        .replace("{pct}", String(pct));
    }
    case "ALERT_INCOMPLETE_ACCOUNT":
      return t("notifications.types.ALERT_INCOMPLETE_ACCOUNT_body").replace(
        "{accountName}",
        String(p.accountName ?? ""),
      );
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NotificationsPopover() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedVirtualIds, setDismissedVirtualIds] = useState<Set<string>>(
    () => new Set(),
  );
  const fetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) {
        const json = (await res.json()) as NotificationsResponse;
        setData(json);
        setDismissedVirtualIds(new Set(getDismissedVirtualIdsFromStorage()));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount so badge (unread count) shows without opening the popover
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Refetch when popover opens so list is fresh (and once per open)
  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchNotifications();
    }
    if (!open) {
      fetchedRef.current = false;
    }
  }, [open, fetchNotifications]);

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const virtualIds = (data?.items ?? []).filter((i) => i.kind === "virtual").map((i) => i.id);
    if (virtualIds.length > 0) {
      const next = new Set([...getDismissedVirtualIdsFromStorage(), ...virtualIds]);
      saveDismissedVirtualIds([...next]);
      setDismissedVirtualIds(next);
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            unreadCount: 0,
            items: prev.items.map((item) =>
              item.kind === "persisted" && !item.readAt
                ? { ...item, readAt: new Date().toISOString() }
                : item,
            ),
          }
        : null,
    );
  }

  async function handleItemClick(item: NotificationItem) {
    if (item.kind === "persisted" && !item.readAt) {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: Math.max(0, prev.unreadCount - 1),
              items: prev.items.map((n) =>
                n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n,
              ),
            }
          : null,
      );
    }
    if (item.kind === "virtual" && !dismissedVirtualIds.has(item.id)) {
      const next = new Set([...dismissedVirtualIds, item.id]);
      saveDismissedVirtualIds([...next]);
      setDismissedVirtualIds(next);
    }
    setOpen(false);
  }

  async function handleMarkRead(item: NotificationItem) {
    if (item.kind === "persisted" && !item.readAt) {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) =>
                n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n,
              ),
            }
          : null,
      );
    }
    if (item.kind === "virtual" && !dismissedVirtualIds.has(item.id)) {
      const next = new Set([...dismissedVirtualIds, item.id]);
      saveDismissedVirtualIds([...next]);
      setDismissedVirtualIds(next);
    }
  }

  async function handleMarkUnread(item: NotificationItem) {
    if (item.kind === "persisted" && item.readAt) {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id], unread: true }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) =>
                n.id === item.id ? { ...n, readAt: null } : n,
              ),
            }
          : null,
      );
    }
    if (item.kind === "virtual" && dismissedVirtualIds.has(item.id)) {
      const next = new Set(dismissedVirtualIds);
      next.delete(item.id);
      saveDismissedVirtualIds([...next]);
      setDismissedVirtualIds(next);
    }
  }

  const isMobile = useIsMobile();
  const allItems = data?.items ?? [];
  const isItemUnread = (item: NotificationItem): boolean =>
    item.kind === "persisted" ? !item.readAt : !dismissedVirtualIds.has(item.id);
  const filteredItems =
    tab === "unread" ? allItems.filter(isItemUnread) : allItems;
  const unreadCount = allItems.filter(isItemUnread).length;

  const todayItems = filteredItems.filter((item) => isToday(item.createdAt));
  const earlierItems = filteredItems.filter((item) => !isToday(item.createdAt));

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 rounded-full"
      aria-label={t("notifications.title")}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 text-white items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationContent = (
    <>
      {/* Header — pr-10 on mobile for Sheet close button */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-4 py-3",
          isMobile && "pr-10",
        )}
      >
        <h2 className="font-semibold text-base">{t("notifications.title")}</h2>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => void handleMarkAllRead()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 px-3 py-2 border-b">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium transition-colors",
            tab === "all"
              ? "bg-gray-200"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {t("notifications.tabAll")}
        </button>
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={cn(
            "flex gap-2 px-2 py-1 rounded-full text-sm font-medium transition-colors",
            tab === "unread"
              ? "bg-gray-200"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {t("notifications.tabUnread")}
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full text-white bg-destructive text-destructive-foreground text-[10px] font-bold min-w-5 h-5 px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification list */}
      <div
        className={cn(
          "min-h-0 overflow-y-auto",
          isMobile ? "flex-1" : "max-h-[min(70vh,400px)]",
        )}
      >
        {loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5 animate-pulse" />
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5 opacity-40" />
            <p>
              {tab === "unread"
                ? t("notifications.emptyUnread")
                : t("notifications.empty")}
            </p>
          </div>
        )}

        {!loading && todayItems.length > 0 && (
          <section>
            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("notifications.groupToday")}
            </p>
            {todayItems.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  isUnread={isItemUnread(item)}
                  t={t}
                  onClick={handleItemClick}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={handleMarkUnread}
                />
              ))}
          </section>
        )}

        {!loading && earlierItems.length > 0 && (
          <section>
            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("notifications.groupEarlier")}
            </p>
            {earlierItems.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  isUnread={isItemUnread(item)}
                  t={t}
                  onClick={handleItemClick}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={handleMarkUnread}
                />
              ))}
          </section>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={true}
          className="flex h-dvh max-h-dvh flex-col gap-0 overflow-hidden rounded-t-2xl p-0 top-[56px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("notifications.title")}</SheetTitle>
            <SheetDescription>
              {t("notifications.tabAll")}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {notificationContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex flex-col w-[min(380px,95vw)] p-0 rounded-xl shadow-lg overflow-hidden"
      >
        {notificationContent}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

function NotificationRow({
  item,
  isUnread,
  t,
  onClick,
  onMarkRead,
  onMarkUnread,
}: {
  item: NotificationItem;
  isUnread: boolean;
  t: ReturnType<typeof useI18n>["t"];
  onClick: (item: NotificationItem) => void | Promise<void>;
  onMarkRead: (item: NotificationItem) => void | Promise<void>;
  onMarkUnread: (item: NotificationItem) => void | Promise<void>;
}) {
  const body = useNotificationBody(item, t);
  const Icon = getIcon(item.type);

  const typeKey = item.type as keyof ReturnType<typeof useI18n>["t"] extends never
    ? string
    : string;
  const title = (() => {
    try {
      return t(`notifications.types.${typeKey}` as Parameters<typeof t>[0]);
    } catch {
      return item.type;
    }
  })();

  const content = (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
        isUnread
          ? "bg-primary/2 hover:bg-primary/5"
          : "hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={() => void onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") void onClick(item);
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isUnread
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", isUnread ? "font-semibold" : "font-medium")}>
          {title}
        </p>
        {body && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
            {body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(item.createdAt, t)}
        </p>
      </div>

      {/* Menu + unread dot — top right */}
      <div
        className="absolute right-3 top-3 flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {isUnread && (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-destructive"
            aria-hidden
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full opacity-70 hover:opacity-100"
              aria-label={t("notifications.moreOptions")}
            >
              <MoreVertical className="h-4 w-4 rotate-90" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isUnread ? (
              <DropdownMenuItem onClick={() => void onMarkRead(item)}>
                {t("notifications.markAsRead")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => void onMarkUnread(item)}>
                {t("notifications.markAsUnread")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
      </div>
    </div>
  );

  if (item.link) {
    return (
      <Link href={item.link} onClick={() => void onClick(item)} tabIndex={-1}>
        {content}
      </Link>
    );
  }

  return content;
}
