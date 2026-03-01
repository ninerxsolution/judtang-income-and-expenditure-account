"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { useI18n } from "@/hooks/use-i18n";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  editName?: string | null;
  onSuccess?: () => void;
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  editId,
  editName,
  onSuccess,
}: CategoryFormDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!editId) {
      setName("");
      setError(null);
      return;
    }
    setName(editName ?? "");
    setError(null);
  }, [open, editId, editName]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("settings.categories.addPlaceholder"));
      return;
    }

    setPending(true);
    try {
      if (editId) {
        const res = await fetch(`/api/categories/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to update");
        }
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to create");
        }
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editId ? t("settings.categories.editTitle") : t("settings.categories.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="category-form-name"
            label={t("settings.categories.addPlaceholder")}
            type="text"
            value={name}
            onChange={setName}
            required
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.actions.save") : t("common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
