"use client";

import { formatAmount } from "@/lib/format";
import { useBudgetSettings } from "@/hooks/use-budget-settings";
import { BudgetMonthToolbar } from "@/components/dashboard/budget/budget-month-toolbar";
import { BudgetCoverageGrid } from "@/components/dashboard/budget/budget-coverage-grid";
import { BudgetTemplateSection } from "@/components/dashboard/budget/budget-template-section";
import { BudgetTotalCard } from "@/components/dashboard/budget/budget-total-card";
import { CategoryBudgetGrid } from "@/components/dashboard/budget/category-budget-grid";
import { BudgetSettingsDialogs } from "@/components/dashboard/budget/budget-settings-dialogs";

export default function BudgetSettingsPage() {
  const bs = useBudgetSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div>
            <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
              {bs.t("settings.budget.description")}
            </p>
          </div>
        </header>

        <BudgetMonthToolbar
          t={bs.t}
          language={bs.language}
          year={bs.year}
          month={bs.month}
          setYear={bs.setYear}
          setMonth={bs.setMonth}
          goToPreviousMonth={bs.goToPreviousMonth}
          goToNextMonth={bs.goToNextMonth}
        />
      </div>

      <BudgetCoverageGrid
        t={bs.t}
        loadingCoverage={bs.loadingCoverage}
        initializedFromQuery={bs.initializedFromQuery}
        coverage={bs.coverage}
        month={bs.month}
        setMonth={bs.setMonth}
        selectedPeriodLabel={bs.selectedPeriodLabel}
      />

      <BudgetTemplateSection
        t={bs.t}
        loadingTemplates={bs.loadingTemplates}
        templates={bs.templates}
        applyTemplateId={bs.applyTemplateId}
        setApplyTemplateId={bs.setApplyTemplateId}
        applying={bs.applying}
        onApplyTemplate={() => void bs.handleApplyTemplate()}
        onOpenTemplatesDialog={() => bs.setTemplatesDialogOpen(true)}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <BudgetTotalCard
          t={bs.t}
          loadingBudget={bs.loadingBudget}
          budget={bs.budget}
          totalBudgetNum={bs.totalBudgetNum}
          totalSpent={bs.totalSpent}
          selectedPeriodLabel={bs.selectedPeriodLabel}
          onEditTotalBudget={bs.openEditTotalBudgetDialog}
        />

        <CategoryBudgetGrid
          t={bs.t}
          loadingBudget={bs.loadingBudget}
          budget={bs.budget}
          onAddClick={() => bs.setAddCategoryOpen(true)}
          onEditCategory={(id, limitAmount) => {
            bs.setEditCategoryBudgetId(id);
            bs.setEditCategoryBudgetAmount(formatAmount(limitAmount));
          }}
          onDeleteCategory={(id) => bs.setDeleteCategoryId(id)}
        />
      </div>

      <BudgetSettingsDialogs
        t={bs.t}
        createTemplateOpen={bs.createTemplateOpen}
        setCreateTemplateOpen={bs.setCreateTemplateOpen}
        editTemplateId={bs.editTemplateId}
        setEditTemplateId={bs.setEditTemplateId}
        templateFormName={bs.templateFormName}
        setTemplateFormName={bs.setTemplateFormName}
        templateFormTotalBudget={bs.templateFormTotalBudget}
        setTemplateFormTotalBudget={bs.setTemplateFormTotalBudget}
        templateFormCategoryLimits={bs.templateFormCategoryLimits}
        addTemplateLimitRow={bs.addTemplateLimitRow}
        removeTemplateLimitRow={bs.removeTemplateLimitRow}
        updateTemplateLimitRow={bs.updateTemplateLimitRow}
        sortedCategoriesForPicker={bs.sortedCategoriesForPicker}
        savingTemplate={bs.savingTemplate}
        onSaveTemplate={() => void bs.handleSaveTemplate()}
        templatesDialogOpen={bs.templatesDialogOpen}
        setTemplatesDialogOpen={bs.setTemplatesDialogOpen}
        loadingTemplates={bs.loadingTemplates}
        templates={bs.templates}
        onOpenCreateTemplate={bs.openCreateTemplate}
        onOpenEditTemplate={bs.openEditTemplate}
        setDeleteTemplateId={bs.setDeleteTemplateId}
        deleteTemplateId={bs.deleteTemplateId}
        deletingTemplate={bs.deletingTemplate}
        onDeleteTemplate={() => void bs.handleDeleteTemplate()}
        addCategoryOpen={bs.addCategoryOpen}
        setAddCategoryOpen={bs.setAddCategoryOpen}
        newCategoryId={bs.newCategoryId}
        setNewCategoryId={bs.setNewCategoryId}
        newCategoryAmount={bs.newCategoryAmount}
        setNewCategoryAmount={bs.setNewCategoryAmount}
        setCategoryMruTick={bs.setCategoryMruTick}
        sortedAvailableCategoriesForBudget={bs.sortedAvailableCategoriesForBudget}
        savingCategory={bs.savingCategory}
        onAddCategoryBudget={() => void bs.handleAddCategoryBudget()}
        editCategoryBudgetId={bs.editCategoryBudgetId}
        setEditCategoryBudgetId={bs.setEditCategoryBudgetId}
        editCategoryBudgetAmount={bs.editCategoryBudgetAmount}
        setEditCategoryBudgetAmount={bs.setEditCategoryBudgetAmount}
        savingEditCategory={bs.savingEditCategory}
        onSaveEditCategoryBudget={() => void bs.handleSaveEditCategoryBudget()}
        editTotalBudgetOpen={bs.editTotalBudgetOpen}
        setEditTotalBudgetOpen={bs.setEditTotalBudgetOpen}
        editTotalBudgetAmount={bs.editTotalBudgetAmount}
        setEditTotalBudgetAmount={bs.setEditTotalBudgetAmount}
        savingTotal={bs.savingTotal}
        onSaveTotalBudget={() => void bs.handleSaveTotalBudgetFromDialog()}
        deleteCategoryId={bs.deleteCategoryId}
        setDeleteCategoryId={bs.setDeleteCategoryId}
        deleting={bs.deleting}
        onDeleteCategoryBudget={(id) => void bs.handleDeleteCategoryBudget(id)}
      />
    </div>
  );
}
