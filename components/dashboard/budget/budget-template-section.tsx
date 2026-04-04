"use client";

import type { Dispatch, SetStateAction } from "react";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BudgetTemplate } from "@/components/dashboard/budget/types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  loadingTemplates: boolean;
  templates: BudgetTemplate[];
  applyTemplateId: string;
  setApplyTemplateId: Dispatch<SetStateAction<string>>;
  applying: boolean;
  onApplyTemplate: () => void;
  onOpenTemplatesDialog: () => void;
};

export function BudgetTemplateSection({
  t,
  loadingTemplates,
  templates,
  applyTemplateId,
  setApplyTemplateId,
  applying,
  onApplyTemplate,
  onOpenTemplatesDialog,
}: Props) {
  return (
    <section className="space-y-4">
      {!loadingTemplates && (
        <div className="flex w-max flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {templates.length > 0 ? (
              <>
                <span className="text-xs font-medium text-[#3D3020] dark:text-stone-200">
                  {t("settings.budget.applyTemplate")}:
                </span>
                <select
                  value={applyTemplateId}
                  onChange={(e) => setApplyTemplateId(e.target.value)}
                  className="h-8 min-w-[140px] flex-1 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring dark:border-stone-700 dark:bg-stone-900"
                  aria-label={t("settings.budget.applyTemplate")}
                >
                  <option value="">
                    {t("settings.budget.templates")}…
                  </option>
                  {templates.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={onApplyTemplate}
                  disabled={!applyTemplateId || applying}
                  style={{ display: applyTemplateId ? "" : "none" }}
                >
                  {applying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("settings.budget.applyTemplate")
                  )}
                </Button>
              </>
            ) : (
              <span className="text-xs font-medium text-[#3D3020] dark:text-stone-200">
                {t("settings.budget.templates")}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenTemplatesDialog}
            aria-label={t("settings.budget.templates")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
