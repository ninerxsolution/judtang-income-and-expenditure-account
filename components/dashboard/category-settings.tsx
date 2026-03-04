"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag, Lock, Plus, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/hooks/use-i18n";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { CategoryFormDialog } from "@/components/dashboard/category-form-dialog";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  createdAt: string;
  isDefault?: boolean;
};

export function CategorySettings() {
  const { t, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addExpanded, setAddExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formEditId, setFormEditId] = useState<string | null>(null);
  const [formEditName, setFormEditName] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error("Failed to load categories");
      }
      const data = (await res.json()) as Category[];
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.categories.error"));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  async function handleAddFromCapsule() {
    const trimmed = addName.trim();
    if (!trimmed || addPending) return;

    setAddPending(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create");
      }
      setAddName("");
      setAddExpanded(false);
      await fetchCategories();
      toast.success(t("common.actions.save"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setAddPending(false);
    }
  }

  function openEdit(cat: Category) {
    setFormEditId(cat.id);
    setFormEditName(cat.name);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteId || deletePending) return;

    setDeletePending(true);
    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete");
      }
      setDeleteId(null);
      await fetchCategories();
      toast.success(t("settings.categories.delete"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setDeletePending(false);
    }
  }

  const defaultCategories = categories.filter((c) => c.isDefault);
  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <section className="rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
              {t("settings.categories.title")}
            </h2>
            <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
              {t("settings.categories.description")}
            </p>
          </div>
        </div>
      </div>

      {loading && !categories.length ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("settings.categories.error")}
        </p>
      ) : (
        <>
          {/* Default categories (read-only) */}
          {defaultCategories.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-[#A09080] dark:text-stone-400">
                {t("settings.categories.defaultLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultCategories.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900/60"
                  >
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[#A09080]" />
                    {getCategoryDisplayName(c.name, localeKey)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom categories (CRUD) */}
          <div className={defaultCategories.length > 0 ? "mt-4" : ""}>
            <p className="mb-2 text-xs font-medium text-[#A09080] dark:text-stone-400">
              {t("settings.categories.customLabel")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {customCategories.length === 0 && !addExpanded && (
                <span className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("settings.categories.empty")}
                </span>
              )}
              {customCategories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900/60"
                >
                  {getCategoryDisplayName(c.name, localeKey)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 -mr-1 rounded-full hover:bg-[#F5F0E8] dark:hover:bg-stone-800"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 -mr-1 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    onClick={() => setDeleteId(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </span>
              ))}

              {/* Add capsule - + button, expands to input + check on click */}
              {addExpanded ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#D4C9B0] bg-[#FDFAF4] px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900/60">
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder={t("settings.categories.addPlaceholder")}
                    className="min-w-[100px] border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:ring-0 dark:bg-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setAddExpanded(false);
                        setAddName("");
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddFromCapsule();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 -mr-1 rounded-full hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
                    onClick={() => void handleAddFromCapsule()}
                    disabled={!addName.trim() || addPending}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddExpanded(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#D4C9B0] bg-[#FDFAF4] px-3 py-1.5 text-sm text-[#A09080] hover:border-[#A09080] hover:text-[#3D3020] dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-300"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  {t("settings.categories.addButton")}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setFormEditId(null);
            setFormEditName(null);
          }
        }}
        editId={formEditId}
        editName={formEditName}
        onSuccess={fetchCategories}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.categories.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.categories.deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deletePending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePending ? t("settings.categories.deletePending") : t("settings.categories.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
