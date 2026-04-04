"use client";

import type { Dispatch, SetStateAction } from "react";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { formatAmount } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { saveRecentCategoryId } from "@/lib/recent-categories";
import type { BudgetTemplate, Category, TemplateFormCategoryRow } from "@/components/dashboard/budget/types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

const dialogFormContentClass =
  "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none";

const dialogSimpleClass =
  "sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none";

export type BudgetSettingsDialogsProps = {
  t: Translate;
  createTemplateOpen: boolean;
  setCreateTemplateOpen: (open: boolean) => void;
  editTemplateId: string | null;
  setEditTemplateId: (id: string | null) => void;
  templateFormName: string;
  setTemplateFormName: (v: string) => void;
  templateFormTotalBudget: string;
  setTemplateFormTotalBudget: (v: string) => void;
  templateFormCategoryLimits: TemplateFormCategoryRow[];
  addTemplateLimitRow: () => void;
  removeTemplateLimitRow: (index: number) => void;
  updateTemplateLimitRow: (
    index: number,
    field: "categoryId" | "limitAmount",
    value: string,
  ) => void;
  sortedCategoriesForPicker: Category[];
  savingTemplate: boolean;
  onSaveTemplate: () => void;
  templatesDialogOpen: boolean;
  setTemplatesDialogOpen: (open: boolean) => void;
  loadingTemplates: boolean;
  templates: BudgetTemplate[];
  onOpenCreateTemplate: () => void;
  onOpenEditTemplate: (tm: BudgetTemplate) => void;
  setDeleteTemplateId: (id: string | null) => void;
  deleteTemplateId: string | null;
  deletingTemplate: boolean;
  onDeleteTemplate: () => void;
  addCategoryOpen: boolean;
  setAddCategoryOpen: (open: boolean) => void;
  newCategoryId: string;
  setNewCategoryId: (v: string) => void;
  newCategoryAmount: string;
  setNewCategoryAmount: (v: string) => void;
  setCategoryMruTick: Dispatch<SetStateAction<number>>;
  sortedAvailableCategoriesForBudget: Category[];
  savingCategory: boolean;
  onAddCategoryBudget: () => void;
  editCategoryBudgetId: string | null;
  setEditCategoryBudgetId: (id: string | null) => void;
  editCategoryBudgetAmount: string;
  setEditCategoryBudgetAmount: (v: string) => void;
  savingEditCategory: boolean;
  onSaveEditCategoryBudget: () => void;
  editTotalBudgetOpen: boolean;
  setEditTotalBudgetOpen: (open: boolean) => void;
  editTotalBudgetAmount: string;
  setEditTotalBudgetAmount: (v: string) => void;
  savingTotal: boolean;
  onSaveTotalBudget: () => void;
  deleteCategoryId: string | null;
  setDeleteCategoryId: (id: string | null) => void;
  deleting: boolean;
  onDeleteCategoryBudget: (id: string) => void;
};

export function BudgetSettingsDialogs({
  t,
  createTemplateOpen,
  setCreateTemplateOpen,
  editTemplateId,
  setEditTemplateId,
  templateFormName,
  setTemplateFormName,
  templateFormTotalBudget,
  setTemplateFormTotalBudget,
  templateFormCategoryLimits,
  addTemplateLimitRow,
  removeTemplateLimitRow,
  updateTemplateLimitRow,
  sortedCategoriesForPicker,
  savingTemplate,
  onSaveTemplate,
  templatesDialogOpen,
  setTemplatesDialogOpen,
  loadingTemplates,
  templates,
  onOpenCreateTemplate,
  onOpenEditTemplate,
  setDeleteTemplateId,
  deleteTemplateId,
  deletingTemplate,
  onDeleteTemplate,
  addCategoryOpen,
  setAddCategoryOpen,
  newCategoryId,
  setNewCategoryId,
  newCategoryAmount,
  setNewCategoryAmount,
  setCategoryMruTick,
  sortedAvailableCategoriesForBudget,
  savingCategory,
  onAddCategoryBudget,
  editCategoryBudgetId,
  setEditCategoryBudgetId,
  editCategoryBudgetAmount,
  setEditCategoryBudgetAmount,
  savingEditCategory,
  onSaveEditCategoryBudget,
  editTotalBudgetOpen,
  setEditTotalBudgetOpen,
  editTotalBudgetAmount,
  setEditTotalBudgetAmount,
  savingTotal,
  onSaveTotalBudget,
  deleteCategoryId,
  setDeleteCategoryId,
  deleting,
  onDeleteCategoryBudget,
}: BudgetSettingsDialogsProps) {
  return (
    <>
      <Dialog
        open={createTemplateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTemplateOpen(false);
            setEditTemplateId(null);
          }
        }}
      >
        <DialogContent className={dialogFormContentClass}>
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editTemplateId
                ? t("settings.budget.editTemplate")
                : t("settings.budget.createTemplate")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              void onSaveTemplate();
            }}
          >
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-form-name">
                  {t("settings.budget.templateName")}
                </Label>
                <Input
                  id="template-form-name"
                  value={templateFormName}
                  onChange={(e) => setTemplateFormName(e.target.value)}
                  placeholder={t("settings.budget.templateName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-form-total">
                  {t("settings.budget.totalBudget")} (฿)
                </Label>
                <Input
                  id="template-form-total"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={templateFormTotalBudget}
                  onChange={(e) => setTemplateFormTotalBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("settings.budget.categoryLimit")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTemplateLimitRow}
                  >
                    <Plus className="h-4 w-4" />
                    {t("settings.budget.addLimitRow")}
                  </Button>
                </div>
                <ul className="space-y-2">
                  {templateFormCategoryLimits.map((row, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select
                        value={row.categoryId}
                        onChange={(e) =>
                          updateTemplateLimitRow(
                            index,
                            "categoryId",
                            e.target.value,
                          )
                        }
                        className="h-9 min-w-[120px] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">—</option>
                        {sortedCategoriesForPicker.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        className="w-28 font-mono"
                        value={row.limitAmount}
                        onChange={(e) =>
                          updateTemplateLimitRow(
                            index,
                            "limitAmount",
                            e.target.value,
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeTemplateLimitRow(index)}
                        disabled={templateFormCategoryLimits.length <= 1}
                        aria-label={t("common.actions.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </DialogBody>
            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateTemplateOpen(false);
                  setEditTemplateId(null);
                }}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={savingTemplate}>
                {savingTemplate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.actions.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-lg max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("settings.budget.templates")}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 justify-end pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenCreateTemplate()}
              >
                <Plus className="h-4 w-4" />
                {t("settings.budget.addTemplate")}
              </Button>
            </div>
            <div className="min-h-0 space-y-2 overflow-y-auto">
              {loadingTemplates ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.budget.noTemplates")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {templates.map((tm) => (
                    <li
                      key={tm.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2.5 dark:border-stone-700 dark:bg-stone-900/60"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                          {tm.name}
                        </span>
                        <span className="ml-2 text-xs text-[#A09080] dark:text-stone-400">
                          {tm.totalBudget != null
                            ? `฿${formatAmount(tm.totalBudget)}`
                            : ""}
                          {tm.categoryLimits.length > 0 &&
                            ` · ${tm.categoryLimits.length} ${t("settings.budget.categoryLimit")}(s)`}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onOpenEditTemplate(tm)}
                          aria-label={t("settings.budget.editTemplate")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTemplateId(tm.id)}
                          aria-label={t("settings.budget.deleteTemplate")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTemplateId !== null}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.budget.deleteTemplate")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.budget.templateDeleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onDeleteTemplate()}
              disabled={deletingTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className={dialogSimpleClass}>
          <DialogHeader>
            <DialogTitle>{t("settings.budget.addCategoryBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("settings.categories.title")}</Label>
              <select
                value={newCategoryId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.trim()) {
                    saveRecentCategoryId(v);
                    setCategoryMruTick((tick) => tick + 1);
                  }
                  setNewCategoryId(v);
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t("settings.budget.categoryLimit")}</option>
                {sortedAvailableCategoriesForBudget.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>
                {t("settings.budget.categoryLimit")} (฿)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={newCategoryAmount}
                onChange={(e) => setNewCategoryAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddCategoryOpen(false)}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={() => void onAddCategoryBudget()}
              disabled={savingCategory}
            >
              {savingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCategoryBudgetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCategoryBudgetId(null);
            setEditCategoryBudgetAmount("");
          }
        }}
      >
        <DialogContent className={dialogSimpleClass}>
          <DialogHeader>
            <DialogTitle>{t("settings.budget.editCategoryBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-limit">
                {t("settings.budget.categoryLimit")} (฿)
              </Label>
              <Input
                id="edit-category-limit"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={editCategoryBudgetAmount}
                onChange={(e) => setEditCategoryBudgetAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditCategoryBudgetId(null);
                setEditCategoryBudgetAmount("");
              }}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={() => void onSaveEditCategoryBudget()}
              disabled={savingEditCategory}
            >
              {savingEditCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTotalBudgetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditTotalBudgetOpen(false);
            setEditTotalBudgetAmount("");
          }
        }}
      >
        <DialogContent className={dialogSimpleClass}>
          <DialogHeader>
            <DialogTitle>{t("settings.budget.editTotalBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-total-budget">
                {t("settings.budget.totalBudget")} (฿)
              </Label>
              <Input
                id="edit-total-budget"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={editTotalBudgetAmount}
                onChange={(e) => setEditTotalBudgetAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTotalBudgetOpen(false);
                setEditTotalBudgetAmount("");
              }}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={() => void onSaveTotalBudget()}
              disabled={savingTotal}
            >
              {savingTotal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteCategoryId !== null}
        onOpenChange={(open) => !open && setDeleteCategoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.budget.deleteCategoryBudget")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.budget.deleteCategoryBudgetConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCategoryId) {
                  void onDeleteCategoryBudget(deleteCategoryId);
                }
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
