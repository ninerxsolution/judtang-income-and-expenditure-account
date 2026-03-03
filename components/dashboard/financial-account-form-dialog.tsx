"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { Landmark, CreditCard, Wallet, Banknote, PiggyBank } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { THAI_BANKS, BANK_OTHER } from "@/lib/thai-banks";
import {
  CardAccountTypeSelect,
  CardNetworkSelect,
} from "@/components/dashboard/card-type-select";
import { BankCombobox } from "@/components/dashboard/bank-combobox";

const ACCOUNT_TYPES = ["BANK", "CREDIT_CARD", "WALLET", "CASH", "OTHER"] as const;

const ACCOUNT_TYPE_ICONS: Record<(typeof ACCOUNT_TYPES)[number], React.ComponentType<{ className?: string }>> = {
  BANK: Landmark,
  CREDIT_CARD: CreditCard,
  WALLET: Wallet,
  CASH: Banknote,
  OTHER: PiggyBank,
};
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

function sanitizeNumericInput(value: string, maxLength: number): string {
  const digits = value.replace(/\D/g, "").slice(0, maxLength);
  return digits;
}

/** Format card number for display: "1234567890123456" -> "1234 5678 9012 3456" */
function formatCardNumber(digits: string): string {
  const d = digits.replace(/\D/g, "");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Format bank account for display: "1234567890" -> "123-4-56789-0" (Thai format 3-1-5-1) */
function formatBankAccountNumber(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 4) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}-${d.slice(3, 4)}-${d.slice(4)}`;
  const base = `${d.slice(0, 3)}-${d.slice(3, 4)}-${d.slice(4, 9)}-${d.slice(9, 10)}`;
  if (d.length <= 10) return base;
  return `${base}-${d.slice(10)}`;
}

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.-]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

type FinancialAccountFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  onSuccess?: () => void;
};

export function FinancialAccountFormDialog({
  open,
  onOpenChange,
  editId,
  onSuccess,
}: FinancialAccountFormDialogProps) {
  const { t, locale } = useI18n();
  const localeKey = locale?.startsWith("th") ? "th" : "en";
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CASH");
  const [initialBalance, setInitialBalance] = useState("0");
  const [creditLimit, setCreditLimit] = useState("");
  const [statementClosingDay, setStatementClosingDay] = useState<string>("");
  const [dueDay, setDueDay] = useState<string>("");
  const [bankId, setBankId] = useState<string>("");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountNumberMode, setAccountNumberMode] = useState<"FULL" | "LAST_4_ONLY">("FULL");
  const [interestRate, setInterestRate] = useState("");
  const [cardAccountType, setCardAccountType] = useState<string>("");
  const [cardNetwork, setCardNetwork] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "done" | "error">(
    editId ? "loading" : "idle"
  );

  useEffect(() => {
    if (!open) return;
    if (!editId) {
      setName("");
      setType("CASH");
      setInitialBalance("0");
      setCreditLimit("");
      setStatementClosingDay("");
      setDueDay("");
      setBankId("");
      setCustomBankName("");
      setAccountNumber("");
      setAccountNumberMode("FULL");
      setInterestRate("");
      setCardAccountType("");
      setCardNetwork("");
      setLoadState("idle");
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    setError(null);
    fetch(`/api/financial-accounts/${editId}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setLoadState("error");
          setError(t("accounts.loadFailed"));
          return;
        }
        return res.json();
      })
      .then(
        (data: {
          name: string;
          type: string;
          initialBalance: number;
          creditLimit?: number | null;
          statementClosingDay?: number | null;
          dueDay?: number | null;
          bankName?: string | null;
          accountNumber?: string | null;
          accountNumberMode?: string | null;
          interestRate?: number | null;
          cardAccountType?: string | null;
          cardNetwork?: string | null;
        } | undefined) => {
          if (cancelled || !data) return;
          setName(data.name ?? "");
          setType(ACCOUNT_TYPES.includes(data.type as (typeof ACCOUNT_TYPES)[number]) ? data.type : "CASH");
          setInitialBalance(sanitizeAmountInput(String(data.initialBalance ?? 0)));
          setCreditLimit(data.creditLimit != null ? String(data.creditLimit) : "");
          setStatementClosingDay(data.statementClosingDay != null ? String(data.statementClosingDay) : "");
          setDueDay(data.dueDay != null ? String(data.dueDay) : "");
          setAccountNumber(data.accountNumber ?? "");
          setAccountNumberMode(
            data.accountNumberMode === "LAST_4_ONLY" ? "LAST_4_ONLY" : "FULL"
          );
          setInterestRate(
            data.interestRate != null ? String(data.interestRate) : ""
          );
          setCardAccountType(data.cardAccountType ?? "");
          setCardNetwork(data.cardNetwork ?? "");
          const bn = data.bankName?.trim() ?? "";
          if (bn && THAI_BANKS.some((b) => b.id === bn)) {
            setBankId(bn);
            setCustomBankName("");
          } else if (bn) {
            setBankId(BANK_OTHER);
            setCustomBankName(bn);
          } else {
            setBankId("");
            setCustomBankName("");
          }
          setLoadState("done");
        }
      )
      .catch(() => {
        if (!cancelled) {
          setLoadState("error");
          setError(t("accounts.loadFailed"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, editId, t]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("accounts.nameRequired"));
      return;
    }

    if ((type === "BANK" || type === "WALLET") && bankId) {
      const accNum = accountNumber.replace(/\D/g, "");
      if (accountNumberMode === "FULL" && accNum.length < 4) {
        setError(
          localeKey === "th"
            ? "กรุณากรอกเลขบัญชีอย่างน้อย 4 หลัก"
            : "Please enter at least 4 digits for account number"
        );
        return;
      }
      if (accountNumberMode === "LAST_4_ONLY" && accNum.length !== 4) {
        setError(
          localeKey === "th"
            ? "กรุณากรอกเลข 4 ตัวท้าย"
            : "Please enter exactly 4 digits"
        );
        return;
      }
    }

    if (type === "CREDIT_CARD") {
      const accNum = accountNumber.replace(/\D/g, "");
      if (accNum.length !== 4) {
        setError(
          localeKey === "th"
            ? "กรุณากรอกเลข 4 ตัวท้ายของบัตร"
            : "Please enter exactly 4 digits (last 4 of card)"
        );
        return;
      }
      const closingDay = statementClosingDay
        ? Number.parseInt(statementClosingDay, 10)
        : 0;
      const dueDayNum = dueDay ? Number.parseInt(dueDay, 10) : 0;
      if (!statementClosingDay || closingDay < 1 || closingDay > 31) {
        setError(
          t("accounts.statementClosingDayRequired") ??
            "Please select statement closing day (1–31)."
        );
        return;
      }
      if (!dueDay || dueDayNum < 1 || dueDayNum > 31) {
        setError(
          t("accounts.dueDayRequired") ??
            "Please select payment due day (1–31)."
        );
        return;
      }
      const creditLimitNum = creditLimit ? Number.parseFloat(creditLimit.replace(/,/g, "")) : NaN;
      if (!creditLimit || !Number.isFinite(creditLimitNum) || creditLimitNum < 0) {
        setError(
          t("accounts.creditLimitRequired") ??
            "Please enter credit limit."
        );
        return;
      }
      const interestRateNum = interestRate ? Number.parseFloat(interestRate.replace(/,/g, "")) : NaN;
      if (!interestRate || !Number.isFinite(interestRateNum) || interestRateNum < 0) {
        setError(
          t("accounts.interestRateRequired") ??
            "Please enter interest rate (%)."
        );
        return;
      }
      if (!cardAccountType?.trim()) {
        setError(
          t("accounts.cardAccountTypeRequired") ??
            "Please select card type (credit/debit/prepaid)."
        );
        return;
      }
    }

    const balanceNum = Number.parseFloat(initialBalance.replace(/,/g, ""));
    const balance = Number.isFinite(balanceNum) ? balanceNum : 0;
    const creditLimitNum = creditLimit ? Number.parseFloat(creditLimit.replace(/,/g, "")) : undefined;
    const closingDay = statementClosingDay
      ? Number.parseInt(statementClosingDay, 10)
      : undefined;
    const dueDayNum = dueDay ? Number.parseInt(dueDay, 10) : undefined;

    const payload: Record<string, unknown> = {
      name: trimmedName,
      type,
      initialBalance: balance,
    };
    if (type === "CREDIT_CARD") {
      if (creditLimitNum != null && Number.isFinite(creditLimitNum)) payload.creditLimit = creditLimitNum;
      if (closingDay != null && closingDay >= 1 && closingDay <= 31) payload.statementClosingDay = closingDay;
      if (dueDayNum != null && dueDayNum >= 1 && dueDayNum <= 31) payload.dueDay = dueDayNum;
      const interestRateNum = interestRate ? Number.parseFloat(interestRate.replace(/,/g, "")) : undefined;
      payload.interestRate =
        interestRateNum != null && Number.isFinite(interestRateNum) && interestRateNum >= 0
          ? interestRateNum
          : null;
      payload.cardAccountType = cardAccountType || null;
      payload.cardNetwork = cardNetwork?.trim() || null;
    }
    if (bankId === BANK_OTHER) {
      payload.bankName = customBankName.trim() || null;
    } else if (bankId && bankId !== BANK_OTHER) {
      payload.bankName = bankId;
    } else {
      payload.bankName = null;
    }
    const accNum = accountNumber.replace(/\D/g, "");
    payload.accountNumber = accNum || null;
    if (type === "BANK" || type === "WALLET") {
      payload.accountNumberMode = accountNumberMode;
    }

    setPending(true);
    try {
      if (editId) {
        const res = await fetch(`/api/financial-accounts/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Failed to update");
        }
      } else {
        const res = await fetch("/api/financial-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
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
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {editId ? t("accounts.editTitle") : t("accounts.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <DialogBody className="space-y-4 pl-1">
            {loadState === "loading" && (
              <p className="text-sm text-[#A09080]">{t("transactions.edit.loading")}</p>
            )}
            {loadState === "error" && error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {(loadState === "idle" || loadState === "done") && (
            <>
              <FormField
                id="account-form-name"
                label={t("accounts.nameLabel")}
                type="text"
                value={name}
                onChange={setName}
                required
              />
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t("accounts.typeLabel")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((tpe) => {
                    const Icon = ACCOUNT_TYPE_ICONS[tpe];
                    const isSelected = type === tpe;
                    return (
                      <button
                        key={tpe}
                        type="button"
                        onClick={() => setType(tpe)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all hover:border-[#5C6B52] dark:hover:border-stone-500 ${
                          isSelected
                            ? "border-[#5C6B52] bg-[#EBF4E3] dark:border-stone-500 dark:bg-[#5C6B52]/20"
                            : "border-[#D4C9B0] bg-[#FDFAF4] dark:border-stone-600 dark:bg-stone-900"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-[#5C6B52]/20 text-[#5C6B52] dark:bg-[#5C6B52]/40 dark:text-emerald-300"
                              : "bg-[#E8E0C8] text-[#6B5E4E] dark:bg-stone-800 dark:text-stone-400"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-[#3D3020] dark:text-stone-100"
                              : "text-[#6B5E4E] dark:text-stone-400"
                          }`}
                        >
                          {t(`accounts.type.${tpe}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(type === "BANK" || type === "CREDIT_CARD" || type === "WALLET") && (
                <>
                  <div>
                    <label
                      htmlFor="account-form-bank"
                      className="mb-1 block text-sm font-medium"
                    >
                      {t("accounts.bankNameLabel")}
                    </label>
                    <BankCombobox
                      id="account-form-bank"
                      value={bankId}
                      onChange={(id) => {
                        setBankId(id);
                        if (id !== BANK_OTHER) setCustomBankName("");
                      }}
                      placeholder={t("accounts.bankSearchPlaceholder")}
                      noResultsText={t("accounts.bankNoResults")}
                      noneLabel={t("accounts.bankNone")}
                      localeKey={localeKey}
                      className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  {bankId === BANK_OTHER && (
                    <FormField
                      id="account-form-custom-bank"
                      label={t("accounts.bankNameLabel")}
                      type="text"
                      value={customBankName}
                      onChange={setCustomBankName}
                      placeholder={t("accounts.bankNamePlaceholder")}
                    />
                  )}
                </>
              )}
              {(type === "BANK" || type === "WALLET") && (
                <>
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      {localeKey === "th" ? "โหมดเก็บเลขบัญชี" : "Account number storage"}
                    </p>
                    <div className="inline-flex rounded-xl gap-1 border border-[#D4C9B0] bg-[#FDFAF4] p-1 dark:border-stone-600 dark:bg-stone-900">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={accountNumberMode === "FULL"}
                        onClick={() => setAccountNumberMode("FULL")}
                        className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                          accountNumberMode === "FULL"
                            ? "bg-[#5C6B52] text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
                            : "text-[#6B5E4E] hover:bg-[#F5F0E8] dark:text-stone-400 dark:hover:bg-stone-800"
                        }`}
                      >
                        {t("accounts.accountNumberModeFull")}
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={accountNumberMode === "LAST_4_ONLY"}
                        onClick={() => setAccountNumberMode("LAST_4_ONLY")}
                        className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                          accountNumberMode === "LAST_4_ONLY"
                            ? "bg-[#5C6B52] text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
                            : "text-[#6B5E4E] hover:bg-[#F5F0E8] dark:text-stone-400 dark:hover:bg-stone-800"
                        }`}
                      >
                        {t("accounts.accountNumberModeLast4")}
                      </button>
                    </div>
                  </div>
                  <FormField
                    id="account-form-account-number"
                    label={t("accounts.accountNumberLabel")}
                    type="text"
                    value={
                      accountNumberMode === "FULL"
                        ? formatBankAccountNumber(accountNumber)
                        : accountNumber
                    }
                    onChange={(v) =>
                      setAccountNumber(
                        sanitizeNumericInput(
                          v,
                          accountNumberMode === "FULL" ? 12 : 4
                        )
                      )
                    }
                    placeholder={
                      accountNumberMode === "FULL"
                        ? t("accounts.accountNumberPlaceholder")
                        : t("accounts.cardNumberPlaceholder")
                    }
                    inputMode="numeric"
                  />
                </>
              )}
              {type === "CREDIT_CARD" && (
                <FormField
                  id="account-form-account-number"
                  label={t("accounts.cardNumberLabel")}
                  type="text"
                  value={accountNumber}
                  onChange={(v) =>
                    setAccountNumber(sanitizeNumericInput(v, 4))
                  }
                  placeholder={t("accounts.cardNumberPlaceholder")}
                  inputMode="numeric"
                />
              )}
              {type !== "CREDIT_CARD" && (
                <FormField
                  id="account-form-initial-balance"
                  label={t("accounts.initialBalanceLabel")}
                  type="text"
                  value={initialBalance}
                  onChange={(v) => setInitialBalance(sanitizeAmountInput(v))}
                />
              )}
              {type === "CREDIT_CARD" && (
                <>
                  <div>
                    <label
                      htmlFor="account-form-card-account-type"
                      className="mb-1 block text-sm font-medium"
                    >
                      {t("accounts.cardAccountTypeLabel")}
                    </label>
                    <CardAccountTypeSelect
                      id="account-form-card-account-type"
                      value={cardAccountType}
                      onChange={setCardAccountType}
                      localeKey={localeKey}
                      required={type === "CREDIT_CARD"}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="account-form-card-network"
                      className="mb-1 block text-sm font-medium"
                    >
                      {t("accounts.cardNetworkLabel")}
                    </label>
                    <CardNetworkSelect
                      id="account-form-card-network"
                      value={cardNetwork}
                      onChange={setCardNetwork}
                      localeKey={localeKey}
                    />
                  </div>
                  <FormField
                    id="account-form-credit-limit"
                    label={t("accounts.creditLimitLabel")}
                    type="text"
                    value={creditLimit}
                    onChange={(v) => setCreditLimit(sanitizeAmountInput(v))}
                    required={type === "CREDIT_CARD"}
                  />
                  <FormField
                    id="account-form-interest-rate"
                    label={t("accounts.interestRateLabel")}
                    type="text"
                    value={interestRate}
                    onChange={(v) => setInterestRate(sanitizeAmountInput(v))}
                    placeholder={t("accounts.interestRatePlaceholder")}
                    required={type === "CREDIT_CARD"}
                  />
                  <div>
                    <label
                      htmlFor="account-form-closing-day"
                      className="mb-1 block text-sm font-medium"
                    >
                      {t("accounts.statementClosingDayLabel")}
                    </label>
                    <select
                      id="account-form-closing-day"
                      value={statementClosingDay}
                      onChange={(e) => setStatementClosingDay(e.target.value)}
                      className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="">—</option>
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="account-form-due-day"
                      className="mb-1 block text-sm font-medium"
                    >
                      {t("accounts.dueDayLabel")}
                    </label>
                    <select
                      id="account-form-due-day"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="">—</option>
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}
            {error && (loadState === "idle" || loadState === "done") && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </DialogBody>
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={pending || loadState === "loading"}
            >
              {pending
                ? t("common.actions.save")
                : editId
                  ? t("common.actions.save")
                  : t("accounts.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
