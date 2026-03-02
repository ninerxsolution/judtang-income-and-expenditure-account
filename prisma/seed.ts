import "./load-env";
import bcrypt from "bcrypt";
import { subDays, addDays, startOfDay, endOfDay } from "date-fns";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { THAI_BANKS, BANK_OTHER } from "../lib/thai-banks";
import { CARD_TYPES } from "../lib/card-types";
import {
  closeStatement,
  recordPayment,
  recomputeOutstanding,
  getCurrentOutstanding,
} from "../lib/credit-card";
import { ensureUserHasDefaultFinancialAccount } from "../lib/financial-accounts";
import { DEFAULT_CATEGORY_NAMES } from "../lib/categories";
import { createActivityLog } from "../lib/activity-log";

const RESET_FLAG = process.argv.includes("--reset");

const DEFAULT_USER = {
  email: "anna@example.com",
  name: "Anna",
  password: "password",
};

const CUSTOM_CATEGORY_NAMES = ["ของขวัญ", "ค่ารักษาพยาบาล", "เงินออม"] as const;

const DAYS_BACK = 270;
const MIN_TX_PER_DAY = 4;
const MAX_TX_PER_DAY = 8;

const EXPENSE_RANGES = {
  food: { min: 50, max: 150 },
  transport: { min: 30, max: 120 },
  housing: { min: 5000, max: 12000 },
  utilities: { min: 500, max: 2000 },
  shopping: { min: 200, max: 2000 },
  other: { min: 50, max: 500 },
} as const;

type SeedContext = {
  userId: string;
  categoryMap: Record<string, { id: string; name: string }>;
  bankAccounts: { id: string; name: string }[];
  creditCards: { id: string; name: string; statementClosingDay: number; dueDay: number }[];
  walletAccounts: { id: string; name: string }[];
  otherAccounts: { id: string; name: string }[];
  defaultAccount: { id: string; name: string };
  disabledAccountIds: string[];
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number): number {
  const amount = min + Math.random() * (max - min);
  return Math.round(amount * 100) / 100;
}

function randomAccountNumber(digits: number): string {
  let s = "";
  for (let i = 0; i < digits; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

/** Last 4 digits only (for CREDIT_CARD, BANK/WALLET in LAST_4_ONLY mode) */
function randomLast4(): string {
  return randomAccountNumber(4);
}

async function seedUsers(): Promise<{ id: string; email: string | null; name: string | null }> {
  let user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER.email },
  });
  if (!user) {
    const hashedPassword = await bcrypt.hash(DEFAULT_USER.password, 10);
    user = await prisma.user.create({
      data: {
        email: DEFAULT_USER.email,
        name: DEFAULT_USER.name,
        password: hashedPassword,
      },
    });
    console.log("Created default user:", DEFAULT_USER.email);
  } else {
    console.log("Default user already exists:", DEFAULT_USER.email);
  }
  return user;
}

async function seedFinancialAccounts(
  userId: string
): Promise<{
  defaultAccount: { id: string; name: string };
  bankAccounts: { id: string; name: string }[];
  creditCards: { id: string; name: string; statementClosingDay: number; dueDay: number }[];
  walletAccounts: { id: string; name: string }[];
  otherAccounts: { id: string; name: string }[];
  disabledAccountIds: string[];
}> {
  const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);
  if (!defaultAccount.isDefault) {
    const existingDefault = await prisma.financialAccount.findFirst({
      where: { userId, isDefault: true, isActive: true },
    });
    if (!existingDefault) {
      await prisma.financialAccount.create({
        data: {
          userId,
          name: "บัญชีหลัก",
          type: "CASH",
          initialBalance: 0,
          isActive: true,
          isDefault: true,
        },
      });
    }
  }
  console.log("Default account ready:", defaultAccount.name);

  const bankAccounts: { id: string; name: string }[] = [];
  const banksToCreate = [
    THAI_BANKS[0],
    THAI_BANKS[1],
    THAI_BANKS[2],
  ];
  for (const bank of banksToCreate) {
    const existing = await prisma.financialAccount.findFirst({
      where: { userId, type: "BANK", bankName: bank.id, isActive: true },
    });
    if (!existing) {
      const acc = await prisma.financialAccount.create({
        data: {
          userId,
          name: `บัญชี${bank.nameTh}`,
          type: "BANK",
          bankName: bank.id,
          accountNumber: randomLast4(),
          accountNumberMode: "LAST_4_ONLY",
          initialBalance: randomAmount(20000, 80000),
          isActive: true,
          isDefault: false,
        },
      });
      bankAccounts.push({ id: acc.id, name: acc.name });
      void createActivityLog({
        userId,
        action: "FINANCIAL_ACCOUNT_CREATED",
        entityType: "financialAccount",
        entityId: acc.id,
        details: { name: acc.name },
      });
    } else {
      bankAccounts.push({ id: existing.id, name: existing.name });
    }
  }
  if (bankAccounts.length === 0) {
    const bank = pick(THAI_BANKS);
    const acc = await prisma.financialAccount.create({
      data: {
        userId,
        name: `บัญชี${bank.nameTh}`,
        type: "BANK",
        bankName: bank.id,
        accountNumber: randomLast4(),
        accountNumberMode: "LAST_4_ONLY",
        initialBalance: randomAmount(20000, 80000),
        isActive: true,
        isDefault: false,
      },
    });
    bankAccounts.push({ id: acc.id, name: acc.name });
  }
  console.log("Bank accounts:", bankAccounts.length);

  const creditCards: { id: string; name: string; statementClosingDay: number; dueDay: number }[] = [];
  const existingCards = await prisma.financialAccount.findMany({
    where: { userId, type: "CREDIT_CARD", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  for (const c of existingCards) {
    creditCards.push({
      id: c.id,
      name: c.name,
      statementClosingDay: c.statementClosingDay ?? 15,
      dueDay: c.dueDay ?? 10,
    });
  }
  const cardConfigs = [
    { closing: 15, due: 5 },
    { closing: 25, due: 10 },
  ];
  for (let i = creditCards.length; i < 2; i++) {
    const bank = THAI_BANKS[i + 3] ?? pick(THAI_BANKS);
    const cardType = pick(CARD_TYPES.filter((c) => ["visa", "master", "jcb"].includes(c.id)));
    const config = cardConfigs[i]!;
    const acc = await prisma.financialAccount.create({
      data: {
        userId,
        name: i === 0 ? `บัตรเครดิต${bank.nameTh}` : `บัตรเครดิต${bank.nameTh} 2`,
        type: "CREDIT_CARD",
        bankName: bank.id,
        accountNumber: randomLast4(),
        initialBalance: 0,
        isActive: true,
        isDefault: false,
        creditLimit: randomAmount(30000, 80000),
        interestRate: randomAmount(15, 20),
        cardType: cardType.id,
        statementClosingDay: config.closing,
        dueDay: config.due,
      },
    });
    creditCards.push({
      id: acc.id,
      name: acc.name,
      statementClosingDay: config.closing,
      dueDay: config.due,
    });
  }
  console.log("Credit cards:", creditCards.length);

  const walletAccounts: { id: string; name: string }[] = [];
  const walletConfigs = [
    { name: "TrueMoney Wallet", bankName: "truemoney" },
    { name: "PromptPay", bankName: BANK_OTHER },
  ];
  for (const w of walletConfigs) {
    const existing = await prisma.financialAccount.findFirst({
      where: { userId, type: "WALLET", name: w.name, isActive: true },
    });
    if (!existing) {
      const acc = await prisma.financialAccount.create({
        data: {
          userId,
          name: w.name,
          type: "WALLET",
          bankName: w.bankName,
          accountNumber: randomLast4(),
          accountNumberMode: "LAST_4_ONLY",
          initialBalance: randomAmount(500, 5000),
          isActive: true,
          isDefault: false,
        },
      });
      walletAccounts.push({ id: acc.id, name: acc.name });
    }
  }
  if (walletAccounts.length === 0) {
    const acc = await prisma.financialAccount.create({
      data: {
        userId,
        name: "TrueMoney Wallet",
        type: "WALLET",
        bankName: "truemoney",
        accountNumber: randomLast4(),
        accountNumberMode: "LAST_4_ONLY",
        initialBalance: randomAmount(1000, 3000),
        isActive: true,
        isDefault: false,
      },
    });
    walletAccounts.push({ id: acc.id, name: acc.name });
  }
  console.log("Wallet accounts:", walletAccounts.length);

  const otherAccounts: { id: string; name: string }[] = [];
  const existingOther = await prisma.financialAccount.findFirst({
    where: { userId, type: "OTHER", isActive: true },
  });
  if (!existingOther) {
    const acc = await prisma.financialAccount.create({
      data: {
        userId,
        name: "บัญชีอื่นๆ",
        type: "OTHER",
        bankName: BANK_OTHER,
        accountNumber: randomLast4(),
        accountNumberMode: "LAST_4_ONLY",
        initialBalance: randomAmount(0, 5000),
        isActive: true,
        isDefault: false,
      },
    });
    otherAccounts.push({ id: acc.id, name: acc.name });
  }
  console.log("Other accounts:", otherAccounts.length);

  const disabledAccountIds: string[] = [];
  const disabledBank = await prisma.financialAccount.findFirst({
    where: { userId, type: "BANK", isActive: false },
  });
  if (!disabledBank) {
    const bank = THAI_BANKS[10] ?? pick(THAI_BANKS);
    const acc = await prisma.financialAccount.create({
      data: {
        userId,
        name: `บัญชี${bank.nameTh} (ปิดแล้ว)`,
        type: "BANK",
        bankName: bank.id,
        accountNumber: randomLast4(),
        accountNumberMode: "LAST_4_ONLY",
        initialBalance: randomAmount(5000, 15000),
        isActive: true,
        isDefault: false,
      },
    });
    disabledAccountIds.push(acc.id);
  }
  console.log("Disabled account placeholder created (will disable after transactions)");

  return {
    defaultAccount: { id: defaultAccount.id, name: defaultAccount.name },
    bankAccounts,
    creditCards,
    walletAccounts,
    otherAccounts,
    disabledAccountIds,
  };
}

async function seedCategories(
  userId: string
): Promise<Record<string, { id: string; name: string }>> {
  const categoryMap: Record<string, { id: string; name: string }> = {};
  for (const name of DEFAULT_CATEGORY_NAMES) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
    const cat = existing ?? (await prisma.category.create({
      data: { userId, name, isDefault: true },
    }));
    categoryMap[name] = cat;
  }
  for (const name of CUSTOM_CATEGORY_NAMES) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (!existing) {
      const cat = await prisma.category.create({
        data: { userId, name, isDefault: false },
      });
      categoryMap[name] = cat;
    } else {
      categoryMap[name] = existing;
    }
  }
  console.log("Categories ready:", Object.keys(categoryMap).length);
  return categoryMap;
}

async function seedTransactions(ctx: SeedContext): Promise<number> {
  const today = startOfDay(new Date());
  const startDate = subDays(today, DAYS_BACK);
  const salaryAmount = randomAmount(25000, 45000);
  const rentAmount = randomAmount(EXPENSE_RANGES.housing.min, EXPENSE_RANGES.housing.max);

  const transferableAccounts = [
    ...ctx.bankAccounts,
    ...ctx.walletAccounts,
    ...ctx.otherAccounts,
    ctx.defaultAccount,
  ].filter((a) => !ctx.disabledAccountIds.includes(a.id));

  const primaryBank = ctx.bankAccounts[0]!;
  const primaryCard = ctx.creditCards[0]!;

  let totalTx = 0;
  const expenseCategories = ["อาหาร", "ค่าขนส่ง", "ค่าที่พัก", "ค่าน้ำค่าไฟ", "ค่าอินเทอร์เน็ต", "ช้อปปิ้ง", "ค่าอื่นๆ", "ของขวัญ", "ค่ารักษาพยาบาล"] as const;

  for (let d = 0; d <= DAYS_BACK; d++) {
    const dayStart = addDays(startDate, d);
    const dayEnd = endOfDay(dayStart);
    const txCount = randomInt(MIN_TX_PER_DAY, MAX_TX_PER_DAY);
    const dayOfMonth = dayStart.getDate();

    const txs: {
      type: "INCOME" | "EXPENSE" | "TRANSFER";
      amount: number;
      financialAccountId: string;
      transferAccountId?: string;
      category: string;
      note: string | null;
      occurredAt: Date;
      status: "PENDING" | "POSTED";
    }[] = [];

    const isSalaryDay = dayOfMonth === 15 || dayOfMonth === 25;
    if (isSalaryDay && Math.random() < 0.7) {
      txs.push({
        type: "INCOME",
        amount: salaryAmount,
        financialAccountId: primaryBank.id,
        category: "เงินเดือน",
        note: "เงินเดือน",
        occurredAt: dayStart,
        status: "POSTED",
      });
    }

    if (dayOfMonth === 1 && Math.random() < 0.8) {
      txs.push({
        type: "EXPENSE",
        amount: rentAmount,
        financialAccountId: primaryBank.id,
        category: "ค่าที่พัก",
        note: "ค่าเช่า",
        occurredAt: dayStart,
        status: "POSTED",
      });
    }

    if (dayOfMonth === 5 && Math.random() < 0.7) {
      txs.push({
        type: "EXPENSE",
        amount: randomAmount(EXPENSE_RANGES.utilities.min, EXPENSE_RANGES.utilities.max),
        financialAccountId: primaryBank.id,
        category: "ค่าน้ำค่าไฟ",
        note: "ค่าน้ำค่าไฟ",
        occurredAt: dayStart,
        status: "POSTED",
      });
    }

    const remainingSlots = txCount - txs.length;
    for (let i = 0; i < remainingSlots; i++) {
      const roll = Math.random();
      if (roll < 0.15 && transferableAccounts.length >= 2) {
        const from = pick(transferableAccounts);
        const to = transferableAccounts.find((a) => a.id !== from.id);
        if (to) {
          const amt = randomAmount(100, 2000);
          txs.push({
            type: "TRANSFER",
            amount: amt,
            financialAccountId: from.id,
            transferAccountId: to.id,
            category: "",
            note: `โอนเงิน ${from.name} → ${to.name}`,
            occurredAt: new Date(dayStart.getTime() + Math.random() * (dayEnd.getTime() - dayStart.getTime())),
            status: "POSTED",
          });
        }
      } else {
        const useCreditCard = Math.random() < 0.4 && ctx.creditCards.length > 0;
        const accountId = useCreditCard ? primaryCard.id : primaryBank.id;
        const categoryChoice = pick(expenseCategories);
        const range =
          categoryChoice === "อาหาร" ? EXPENSE_RANGES.food
            : categoryChoice === "ค่าขนส่ง" ? EXPENSE_RANGES.transport
            : categoryChoice === "ช้อปปิ้ง" ? EXPENSE_RANGES.shopping
            : EXPENSE_RANGES.other;
        const status: "PENDING" | "POSTED" = Math.random() < 0.08 ? "PENDING" : "POSTED";
        txs.push({
          type: "EXPENSE",
          amount: randomAmount(range.min, range.max),
          financialAccountId: accountId,
          category: categoryChoice,
          note: Math.random() < 0.3 ? "บันทึกตัวอย่าง" : null,
          occurredAt: new Date(dayStart.getTime() + Math.random() * (dayEnd.getTime() - dayStart.getTime())),
          status,
        });
      }
    }

    for (const tx of txs) {
      const txData = {
        userId: ctx.userId,
        type: tx.type as TransactionType,
        status: (tx.status === "PENDING" ? TransactionStatus.PENDING : TransactionStatus.POSTED) as TransactionStatus,
        amount: tx.amount,
        financialAccountId: tx.financialAccountId,
        transferAccountId: tx.type === "TRANSFER" ? tx.transferAccountId : null,
        category: tx.category || null,
        categoryId: tx.category ? ctx.categoryMap[tx.category]?.id ?? null : null,
        note: tx.note,
        occurredAt: tx.occurredAt,
        postedDate: tx.status === "POSTED" ? tx.occurredAt : null,
      };
      const created = await prisma.transaction.create({ data: txData });
      totalTx++;
      if (totalTx <= 10 && tx.type !== "TRANSFER") {
        void createActivityLog({
          userId: ctx.userId,
          action: "TRANSACTION_CREATED",
          entityType: "transaction",
          entityId: created.id,
          details: {
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            occurredAt: tx.occurredAt.toISOString(),
            accountName: primaryBank.name,
          },
        });
      }
    }

    for (const card of ctx.creditCards) {
      if (dayOfMonth === card.statementClosingDay) {
        const closingDate = new Date(dayStart.getFullYear(), dayStart.getMonth(), card.statementClosingDay);
        try {
          await closeStatement(card.id, closingDate);
        } catch {
          // Statement may already exist
        }
      }
      await recomputeOutstanding(card.id);
    }
  }

  for (const card of ctx.creditCards) {
    const statements = await prisma.creditCardStatement.findMany({
      where: { accountId: card.id, isClosed: true, isPaid: false },
      orderBy: { closingDate: "asc" },
    });
    for (const stmt of statements) {
      const paymentDate = addDays(stmt.closingDate, 2);
      if (paymentDate <= today) {
        try {
          const outstanding = await getCurrentOutstanding(card.id);
          if (outstanding > 0) {
            const toPay = Math.round(outstanding * (0.8 + Math.random() * 0.2) * 100) / 100;
            if (toPay >= 1) {
              await recordPayment({
                userId: ctx.userId,
                accountId: card.id,
                amount: toPay,
                occurredAt: paymentDate,
                fromAccountId: primaryBank.id,
                note: "ชำระบัตรเครดิต",
              });
            }
          }
        } catch {
          // Ignore
        }
      }
    }
    await recomputeOutstanding(card.id);
  }

  if (primaryCard && ctx.creditCards.length > 0) {
    const interestTx = await prisma.transaction.findFirst({
      where: { financialAccountId: primaryCard.id, type: "INTEREST" },
    });
    if (!interestTx) {
      const lastMonth = subDays(today, 35);
      await prisma.transaction.create({
        data: {
          userId: ctx.userId,
          type: TransactionType.INTEREST,
          status: TransactionStatus.POSTED,
          amount: randomAmount(50, 200),
          financialAccountId: primaryCard.id,
          category: "ดอกเบี้ย",
          note: "ดอกเบี้ยบัตรเครดิต",
          occurredAt: lastMonth,
          postedDate: lastMonth,
        },
      });
      totalTx++;
      await recomputeOutstanding(primaryCard.id);
    }
  }

  const voidCandidates = await prisma.transaction.findMany({
    where: { userId: ctx.userId, type: "EXPENSE", status: TransactionStatus.POSTED },
    take: 2,
    orderBy: { occurredAt: "asc" },
  });
  for (const tx of voidCandidates) {
    if (Math.random() < 0.5) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: TransactionStatus.VOID },
      });
    }
  }

  if (primaryCard && ctx.creditCards.length > 0) {
    const hasAdjustment = await prisma.transaction.findFirst({
      where: { financialAccountId: primaryCard.id, type: "ADJUSTMENT" },
    });
    if (!hasAdjustment) {
      const adjDate = subDays(today, 60);
      await prisma.transaction.create({
        data: {
          userId: ctx.userId,
          type: TransactionType.ADJUSTMENT,
          status: TransactionStatus.POSTED,
          amount: randomAmount(10, 50),
          financialAccountId: primaryCard.id,
          category: "ปรับยอด",
          note: "ปรับยอดบัตรเครดิต",
          occurredAt: adjDate,
          postedDate: adjDate,
        },
      });
      totalTx++;
      await recomputeOutstanding(primaryCard.id);
    }
  }

  if (ctx.disabledAccountIds.length > 0) {
    for (const accId of ctx.disabledAccountIds) {
      for (let i = 0; i < 3; i++) {
        const d = addDays(startDate, randomInt(30, 100));
        await prisma.transaction.create({
          data: {
            userId: ctx.userId,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.POSTED,
            amount: randomAmount(50, 500),
            financialAccountId: accId,
            category: "ค่าอื่นๆ",
            note: "รายการก่อนปิดบัญชี",
            occurredAt: d,
            postedDate: d,
          },
        });
        totalTx++;
      }
    }
  }

  return totalTx;
}

async function seedDisabledAccounts(ctx: SeedContext): Promise<void> {
  for (const accId of ctx.disabledAccountIds) {
    await prisma.financialAccount.update({
      where: { id: accId },
      data: { isActive: false },
    });
    void createActivityLog({
      userId: ctx.userId,
      action: "FINANCIAL_ACCOUNT_DISABLED",
      entityType: "financialAccount",
      entityId: accId,
      details: { name: "บัญชีที่ปิดการใช้งาน" },
    });
  }
  if (ctx.disabledAccountIds.length > 0) {
    console.log("Disabled accounts for trash:", ctx.disabledAccountIds.length);
  }
}

async function seedActivityLogs(userId: string): Promise<void> {
  const existing = await prisma.activityLog.findFirst({
    where: { userId, action: "USER_REGISTERED" },
  });
  if (!existing) {
    await prisma.activityLog.createMany({
      data: [
        { userId, action: "USER_REGISTERED", entityType: "user", entityId: userId, details: { name: "Anna" } },
        { userId, action: "USER_LOGGED_IN", entityType: "user", entityId: userId },
      ],
    });
    console.log("Created initial activity log entries.");
  }
}

async function resetSeedData(userId: string): Promise<void> {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.activityLog.deleteMany({ where: { userId } });
  await prisma.financialAccount.deleteMany({
    where: { userId, isDefault: false },
  });
  console.log("Reset transactions, activity logs, and non-default accounts.");
}

async function main() {
  const user = await seedUsers();
  const userId = user.id;

  const existingTxCount = await prisma.transaction.count({ where: { userId } });
  if (existingTxCount > 0 && !RESET_FLAG) {
    console.log(`Skipping transaction seed (${existingTxCount} transactions already exist). Use --reset to reseed.`);
    return;
  }

  if (RESET_FLAG) {
    await resetSeedData(userId);
  }

  await seedActivityLogs(userId);

  const accounts = await seedFinancialAccounts(userId);
  const categoryMap = await seedCategories(userId);

  const ctx: SeedContext = {
    userId,
    categoryMap,
    bankAccounts: accounts.bankAccounts,
    creditCards: accounts.creditCards,
    walletAccounts: accounts.walletAccounts,
    otherAccounts: accounts.otherAccounts,
    defaultAccount: accounts.defaultAccount,
    disabledAccountIds: accounts.disabledAccountIds,
  };

  const totalTx = await seedTransactions(ctx);
  await seedDisabledAccounts(ctx);

  console.log(`Created ${totalTx} transactions over ${DAYS_BACK} days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
