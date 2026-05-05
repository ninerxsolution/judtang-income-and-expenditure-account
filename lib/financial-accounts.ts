import type { FinancialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export {
  isAccountIncomplete,
  isFinancialAccountBalanceReconciliationEligible,
} from "./financial-accounts-shared";

const DEFAULT_ACCOUNT_NAME = "บัญชีหลัก";

/**
 * Ensures the user has at least one FinancialAccount (default).
 * Creates one if none exist. Returns the default or first visible account.
 * When default is hidden, prefers first visible account; falls back to hidden default to avoid creating duplicates.
 */
export async function ensureUserHasDefaultFinancialAccount(
  userId: string
): Promise<FinancialAccount> {
  const visible = await prisma.financialAccount.findFirst({
    where: { userId, isActive: true, isHidden: false },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (visible) return visible;

  const anyAccount = await prisma.financialAccount.findFirst({
    where: { userId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (anyAccount) return anyAccount;

  return prisma.financialAccount.create({
    data: {
      userId,
      name: DEFAULT_ACCOUNT_NAME,
      type: "CASH",
      initialBalance: 0,
      isDefault: true,
      isActive: true,
    },
  });
}

export async function getDefaultFinancialAccount(
  userId: string
): Promise<FinancialAccount | null> {
  const visible = await prisma.financialAccount.findFirst({
    where: { userId, isActive: true, isHidden: false },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (visible) return visible;
  return prisma.financialAccount.findFirst({
    where: { userId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}
