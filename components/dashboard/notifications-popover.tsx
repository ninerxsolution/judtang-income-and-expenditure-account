"use client";

import {
  Bell,
  CheckCheck,
  MoreVertical,
  Trash2,
  Receipt,
  Upload,
  Download,
  CreditCard,
  FileText,
  Percent,
  Scale,
  ArrowLeftRight,
  Repeat,
  CalendarClock,
  PieChart,
  PiggyBank,
  Gauge,
  TrendingDown,
  AlertTriangle,
  LogIn,
  KeyRound,
  ShieldX,
  ShieldAlert,
  UserX,
  Clock,
  Flag,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { NOTIFICATION_REGISTRY } from "@/lib/notification-registry";

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
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

/** How often to refresh while the tab is visible. */
const POLL_INTERVAL_MS = 90_000;

// ---------------------------------------------------------------------------
// Icon resolution (driven by the shared registry)
// ---------------------------------------------------------------------------

const ICONS = {
  Receipt, Upload, Download, CreditCard, FileText, Percent, Scale,
  ArrowLeftRight, Repeat, CalendarClock, PieChart, PiggyBank, Gauge,
  TrendingDown, AlertTriangle, LogIn, KeyRound, ShieldX, ShieldAlert,
  UserX, Clock, Flag, MessageSquare, Megaphone,
} as const;

function getIconElement(type: string) {
  const meta = NOTIFICATION_REGISTRY[type as keyof typeof NOTIFICATION_REGISTRY];
  const Icon = meta ? (ICONS[meta.icon as keyof typeof ICONS] ?? Bell) : Bell;
  return <Icon className="h-4 w-4" />;
}

/** Severity → accent classes for the icon bubble + unread dot. */
function severityClasses(type: string, isUnread: boolean): { bubble: string; dot: string } {
  const meta = NOTIFICATION_REGISTRY[type as keyof typeof NOTIFICATION_REGISTRY];
  const severity = meta?.severity ?? "info";
  if (!isUnread) return { bubble: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  switch (severity) {
    case "critical":
      return { bubble: "bg-destructive/15 text-destructive", dot: "bg-destructive" };
    case "warning":
      return { bubble: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
    default:
      return { bubble: "bg-primary/15 text-primary", dot: "bg-primary" };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string, t: ReturnType<typeof useI18n>["t"]): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
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
  const s = (k: string) => String(p[k] ?? "");
  const n = (k: string) => Number(p[k] ?? 0);
  switch (item.type) {
    case "EVENT_SLIP_DONE":
      return p.hasErrors
        ? t("notifications.types.EVENT_SLIP_DONE_body_partial")
            .replace("{createdCount}", s("createdCount"))
            .replace("{totalCount}", s("totalCount"))
        : t("notifications.types.EVENT_SLIP_DONE_body").replace("{createdCount}", s("createdCount"));
    case "EVENT_IMPORT_DONE":
      return t("notifications.types.EVENT_IMPORT_DONE_body")
        .replace("{createdCount}", s("createdCount"))
        .replace("{updatedCount}", s("updatedCount"))
        .replace("{totalRows}", s("totalRows"));
    case "EVENT_EXPORT_DONE":
      return t("notifications.types.EVENT_EXPORT_DONE_body").replace("{count}", s("count"));
    case "EVENT_CARD_PAYMENT":
      return t("notifications.types.EVENT_CARD_PAYMENT_body")
        .replace("{amount}", formatAmount(n("amount")))
        .replace("{accountName}", s("accountName"));
    case "EVENT_CARD_STATEMENT_CLOSED":
      return t("notifications.types.EVENT_CARD_STATEMENT_CLOSED_body")
        .replace("{accountName}", s("accountName"))
        .replace("{statementBalance}", formatAmount(n("statementBalance")))
        .replace("{minimumPayment}", formatAmount(n("minimumPayment")));
    case "EVENT_CARD_INTEREST_APPLIED":
      return t("notifications.types.EVENT_CARD_INTEREST_APPLIED_body")
        .replace("{accountName}", s("accountName"))
        .replace("{amount}", formatAmount(n("amount")));
    case "EVENT_RECONCILE_MISMATCH":
      return t("notifications.types.EVENT_RECONCILE_MISMATCH_body")
        .replace("{accountName}", s("accountName"))
        .replace("{difference}", formatAmount(Math.abs(n("difference"))));
    case "EVENT_CROSS_CURRENCY_TRANSFER":
      return t("notifications.types.EVENT_CROSS_CURRENCY_TRANSFER_body")
        .replace("{fromAccount}", s("fromAccount"))
        .replace("{toAccount}", s("toAccount"));
    case "EVENT_RECURRING_POSTED":
      return t("notifications.types.EVENT_RECURRING_POSTED_body").replace("{name}", s("name"));
    case "EVENT_SECURITY_NEW_SIGN_IN":
      return t("notifications.types.EVENT_SECURITY_NEW_SIGN_IN_body").replace("{device}", s("device"));
    case "EVENT_SECURITY_PASSWORD_CHANGED":
      return t("notifications.types.EVENT_SECURITY_PASSWORD_CHANGED_body");
    case "EVENT_SECURITY_SESSION_REVOKED":
      return t("notifications.types.EVENT_SECURITY_SESSION_REVOKED_body");
    case "EVENT_ACCOUNT_DEACTIVATED":
      return t("notifications.types.EVENT_ACCOUNT_DEACTIVATED_body").replace("{date}", s("deleteAfter").slice(0, 10));
    case "EVENT_ACCOUNT_STATUS_CHANGED":
      return t("notifications.types.EVENT_ACCOUNT_STATUS_CHANGED_body").replace("{status}", s("status"));
    case "EVENT_REPORT_SUBMITTED":
      return t("notifications.types.EVENT_REPORT_SUBMITTED_body");
    case "EVENT_REPORT_STATUS_CHANGED":
      return t("notifications.types.EVENT_REPORT_STATUS_CHANGED_body").replace("{status}", s("status"));
    case "EVENT_ANNOUNCEMENT":
      return s("message");
    case "ALERT_RECURRING_DUE":
      return t("notifications.types.ALERT_RECURRING_DUE_body").replace("{count}", s("count"));
    case "ALERT_CARD_DUE": {
      const days = n("daysRemaining");
      if (days < 0) return t("notifications.types.ALERT_CARD_DUE_body_overdue").replace("{accountName}", s("accountName"));
      if (days === 0) return t("notifications.types.ALERT_CARD_DUE_body_today").replace("{accountName}", s("accountName"));
      return t("notifications.types.ALERT_CARD_DUE_body")
        .replace("{accountName}", s("accountName"))
        .replace("{daysRemaining}", String(days));
    }
    case "ALERT_BUDGET": {
      const label = p.categoryName ? String(p.categoryName) : t("notifications.types.ALERT_BUDGET_label_total");
      if (p.isOver) return t("notifications.types.ALERT_BUDGET_body_over").replace("{label}", label);
      if (String(p.indicator ?? "") === "full") return t("notifications.types.ALERT_BUDGET_body_full").replace("{label}", label);
      return t("notifications.types.ALERT_BUDGET_body_near")
        .replace("{label}", label)
        .replace("{pct}", String(Math.round(n("progress") * 100)));
    }
    case "ALERT_NO_BUDGET":
      return t("notifications.types.ALERT_NO_BUDGET_body");
    case "ALERT_INCOMPLETE_ACCOUNT":
      return t("notifications.types.ALERT_INCOMPLETE_ACCOUNT_body").replace("{accountName}", s("accountName"));
    case "ALERT_CREDIT_LIMIT":
      return t("notifications.types.ALERT_CREDIT_LIMIT_body").replace("{accountName}", s("accountName"));
    case "ALERT_NEGATIVE_BALANCE":
      return t("notifications.types.ALERT_NEGATIVE_BALANCE_body").replace("{accountName}", s("accountName"));
    case "ALERT_DELETION_PENDING":
      return t("notifications.types.ALERT_DELETION_PENDING_body").replace("{date}", s("deleteAfter").slice(0, 10));
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NotificationsPopover() {
  const { t } = useI18n();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const fetchNotifications = useCallback(async (showSpinner = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) setData((await res.json()) as NotificationsResponse);
    } catch {
      // ignore transient errors; next poll retries
    } finally {
      inFlight.current = false;
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial load (badge) + visibility-gated polling + refetch on window focus.
  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void fetchNotifications();
      }
    }, POLL_INTERVAL_MS);
    const onFocus = () => void fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  // Refresh contents when the panel opens (with spinner).
  useEffect(() => {
    if (open) void fetchNotifications(true);
  }, [open, fetchNotifications]);

  const patchRead = useCallback(async (body: object) => {
    try {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // ignore
    }
  }, []);

  const setItems = useCallback(
    (updater: (items: NotificationItem[]) => NotificationItem[]) =>
      setData((prev) => {
        if (!prev) return prev;
        const items = updater(prev.items);
        return { items, unreadCount: items.filter((i) => !i.readAt).length };
      }),
    [],
  );

  const handleMarkAllRead = useCallback(async () => {
    const stamp = new Date().toISOString();
    setItems((items) => items.map((i) => (i.readAt ? i : { ...i, readAt: stamp })));
    await patchRead({ all: true });
  }, [patchRead, setItems]);

  const handleActivate = useCallback(
    (item: NotificationItem) => {
      if (!item.readAt) {
        const stamp = new Date().toISOString();
        setItems((items) => items.map((i) => (i.id === item.id ? { ...i, readAt: stamp } : i)));
        void patchRead({ ids: [item.id] });
      }
      setOpen(false);
      if (item.link) router.push(item.link);
    },
    [patchRead, router, setItems],
  );

  const handleMarkRead = useCallback(
    (item: NotificationItem) => {
      const stamp = new Date().toISOString();
      setItems((items) => items.map((i) => (i.id === item.id ? { ...i, readAt: stamp } : i)));
      void patchRead({ ids: [item.id] });
    },
    [patchRead, setItems],
  );

  const handleMarkUnread = useCallback(
    (item: NotificationItem) => {
      setItems((items) => items.map((i) => (i.id === item.id ? { ...i, readAt: null } : i)));
      void patchRead({ ids: [item.id], unread: true });
    },
    [patchRead, setItems],
  );

  const handleDelete = useCallback(
    async (item: NotificationItem) => {
      setItems((items) => items.filter((i) => i.id !== item.id));
      try {
        await fetch("/api/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [item.id] }),
        });
      } catch {
        // ignore
      }
    },
    [setItems],
  );

  const allItems = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const filteredItems = tab === "unread" ? allItems.filter((i) => !i.readAt) : allItems;
  const todayItems = filteredItems.filter((i) => isToday(i.createdAt));
  const earlierItems = filteredItems.filter((i) => !isToday(i.createdAt));

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 rounded-full"
      aria-label={
        unreadCount > 0
          ? `${t("notifications.title")} (${unreadCount})`
          : t("notifications.title")
      }
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 text-white items-center justify-center rounded-full bg-destructive text-[12px] font-bold text-destructive-foreground leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationContent = (
    <>
      <div className={cn("flex shrink-0 items-center justify-between border-b px-4 py-3", isMobile && "pr-10")}>
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

      <div className="flex shrink-0 gap-1 px-3 py-2 border-b">
        {(["all", "unread"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors",
              tab === key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {key === "all" ? t("notifications.tabAll") : t("notifications.tabUnread")}
            {key === "unread" && unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full text-white bg-destructive text-destructive-foreground text-[12px] font-bold min-w-5 h-5 px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        className={cn("min-h-0 overflow-y-auto", isMobile ? "flex-1" : "max-h-[min(70vh,400px)]")}
        aria-live="polite"
      >
        {loading && allItems.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5 animate-pulse" />
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5 opacity-40" />
            <p>{tab === "unread" ? t("notifications.emptyUnread") : t("notifications.empty")}</p>
          </div>
        )}

        {todayItems.length > 0 && (
          <NotificationSection
            label={t("notifications.groupToday")}
            items={todayItems}
            t={t}
            onActivate={handleActivate}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onDelete={handleDelete}
          />
        )}
        {earlierItems.length > 0 && (
          <NotificationSection
            label={t("notifications.groupEarlier")}
            items={earlierItems}
            t={t}
            onActivate={handleActivate}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onDelete={handleDelete}
          />
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
            <SheetDescription>{t("notifications.tabAll")}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">{notificationContent}</div>
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
// Section + Row
// ---------------------------------------------------------------------------

type RowHandlers = {
  t: ReturnType<typeof useI18n>["t"];
  onActivate: (item: NotificationItem) => void;
  onMarkRead: (item: NotificationItem) => void;
  onMarkUnread: (item: NotificationItem) => void;
  onDelete: (item: NotificationItem) => void;
};

function NotificationSection({ label, items, ...handlers }: { label: string; items: NotificationItem[] } & RowHandlers) {
  return (
    <section>
      <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {items.map((item) => (
        <NotificationRow key={item.id} item={item} {...handlers} />
      ))}
    </section>
  );
}

function NotificationRow({
  item,
  t,
  onActivate,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: { item: NotificationItem } & RowHandlers) {
  const body = useNotificationBody(item, t);
  const isUnread = !item.readAt;
  const { bubble, dot } = severityClasses(item.type, isUnread);

  let title = item.type;
  const key = `notifications.types.${item.type}` as Parameters<typeof t>[0];
  const resolved = t(key);
  if (resolved && resolved !== key) title = resolved;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
        isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent hover:text-accent-foreground",
      )}
      role="button"
      tabIndex={0}
      aria-label={isUnread ? `${title} (${t("notifications.tabUnread")})` : title}
      onClick={() => onActivate(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(item);
        }
      }}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bubble)}>
        {getIconElement(item.type)}
      </div>

      <div className="flex-1 min-w-0 pr-8">
        <p className={cn("text-sm leading-snug", isUnread ? "font-semibold" : "font-medium")}>{title}</p>
        {body && <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{body}</p>}
        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(item.createdAt, t)}</p>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {isUnread && <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />}
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
              <DropdownMenuItem onClick={() => onMarkRead(item)}>{t("notifications.markAsRead")}</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onMarkUnread(item)}>{t("notifications.markAsUnread")}</DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => void onDelete(item)}>
              <Trash2 className="h-4 w-4" />
              {t("notifications.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
