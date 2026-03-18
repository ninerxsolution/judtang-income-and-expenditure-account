"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useI18n } from "@/hooks/use-i18n";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerified: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  transactionCount: number;
  accountCount: number;
};

type ListResponse = {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
};

const ROLE_OPTIONS = [
  { value: "", labelKey: "roleAll" as const },
  { value: "USER", labelKey: "roleUser" as const },
  { value: "ADMIN", labelKey: "roleAdmin" as const },
];

const STATUS_OPTIONS = [
  { value: "", labelKey: "statusAll" as const },
  { value: "ACTIVE", labelKey: "statusActive" as const },
  { value: "SUSPENDED", labelKey: "statusSuspended" as const },
  { value: "DELETED", labelKey: "statusDeleted" as const },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<"USER" | "ADMIN">("USER");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED" | "DELETED">("ACTIVE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);

    queueMicrotask(() => setLoading(true));
    fetch(`/api/admin/users?${params}`)
      .then((res) => {
        if (res.status === 403) {
          window.location.href = "/dashboard";
          return null;
        }
        return res.json();
      })
      .then((data: ListResponse | null) => {
        if (data) {
          setUsers(data.users);
          setTotal(data.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, roleFilter, statusFilter, search]);

  const totalPages = Math.ceil(total / limit);

  function openEditDialog(user: UserRow) {
    setEditUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
  }

  async function handleSaveEdit() {
    if (!editUser || (editRole === editUser.role && editStatus === editUser.status)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, status: editStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editUser.id
              ? { ...u, role: editRole, status: editStatus }
              : u
          )
        );
        setEditUser(null);
      }
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "SUSPENDED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "DELETED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  }

  function getRoleBadgeClass(role: string): string {
    return role === "ADMIN"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">{t("admin.users.title")}</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {t("admin.users.subtitle")}
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">{t("admin.users.role")}</Label>
          <select
            id="role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {t(`admin.users.${o.labelKey}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">{t("admin.users.status")}</Label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {t(`admin.users.${o.labelKey}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="search">{t("admin.users.search")}</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              type="text"
              placeholder={t("admin.users.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
              className="w-48"
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                setSearch(searchInput);
                setPage(1);
              }}
              aria-label={t("admin.users.search")}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/50">
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.email")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.role")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.lastActive")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.transactionCount")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("admin.users.accountCount")}</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[#D4C9B0] dark:border-stone-800">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-[#A09080] dark:text-stone-400">
          {t("admin.users.empty")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/50">
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.email")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.role")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.lastActive")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.transactionCount")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("admin.users.accountCount")}</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[#D4C9B0] dark:border-stone-800 hover:bg-[#F5F0E8] dark:hover:bg-stone-900/30"
                  >
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(u.role)}`}
                      >
                        {t(`admin.users.role${u.role === "ADMIN" ? "Admin" : "User"}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(u.status)}`}
                      >
                        {t(`admin.users.status${u.status === "ACTIVE" ? "Active" : u.status === "SUSPENDED" ? "Suspended" : "Deleted"}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {formatDate(u.lastActiveAt)}
                    </td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {u.transactionCount}
                    </td>
                    <td className="px-4 py-3 text-[#6B5E4E] dark:text-stone-400">
                      {u.accountCount}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(u)}>
                            {t("admin.users.editRole")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#A09080] dark:text-stone-400">
                {t("admin.users.pageInfo", {
                  page: String(page),
                  totalPages: String(totalPages),
                  total: String(total),
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent className="max-w-md gap-0 p-0 rounded-2xl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{t("admin.users.actions")}</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div>
              <Label>{t("admin.users.email")}</Label>
              <p className="mt-1 text-sm">{editUser?.email ?? "—"}</p>
            </div>
            <div>
              <Label>{t("admin.users.name")}</Label>
              <p className="mt-1 text-sm">{editUser?.name ?? "—"}</p>
            </div>
            <div>
              <Label htmlFor="edit-role">{t("admin.users.role")}</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "USER" | "ADMIN")}
                className="mt-1 w-full rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="USER">{t("admin.users.roleUser")}</option>
                <option value="ADMIN">{t("admin.users.roleAdmin")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-status">{t("admin.users.status")}</Label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "SUSPENDED" | "DELETED")}
                className="mt-1 w-full rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="ACTIVE">{t("admin.users.statusActive")}</option>
                <option value="SUSPENDED">{t("admin.users.statusSuspended")}</option>
                <option value="DELETED">{t("admin.users.statusDeleted")}</option>
              </select>
            </div>
          </div>
          <DialogFooter className="p-4 pt-2">
            <DialogClose asChild>
              <Button variant="outline">{t("common.actions.cancel")}</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? t("common.actions.save") + "…" : t("common.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
