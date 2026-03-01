import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { subDays, addDays, startOfDay, endOfDay } from "date-fns";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { THAI_BANKS } from "../lib/thai-banks";
import { CARD_TYPES } from "../lib/card-types";
import {
  closeStatement,
  recordPayment,
  recomputeOutstanding,
  getCurrentOutstanding,
} from "../lib/credit-card";
import { ensureUserHasDefaultFinancialAccount } from "../lib/financial-accounts";
import { DEFAULT_CATEGORY_NAMES } from "../lib/categories";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const DEFAULT_USER = {
  email: "anna@example.com",
  name: "Anna",
  password: "password",
};

const DAYS_BACK = 270;
const MIN_TX_PER_DAY = 4;
const MAX_TX_PER_DAY = 8;

// Office worker expense ranges (THB)
const EXPENSE_RANGES = {
  food: { min: 50, max: 150 },
  transport: { min: 30, max: 120 },
  housing: { min: 5000, max: 12000 },
  utilities: { min: 500, max: 2000 },
  shopping: { min: 200, max: 2000 },
  other: { min: 50, max: 500 },
} as const;


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

async function findOrCreateCategory(
  userId: string,
  name: string
): Promise<{ id: string; name: string }> {
  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) return existing;
  return prisma.category.create({
    data: { userId, name },
  });
}

async function main() {
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

    await prisma.activityLog.createMany({
      data: [
        {
          userId: user.id,
          action: "USER_REGISTERED",
          entityType: "user",
          entityId: user.id,
          details: { name: user.name ?? user.email },
        },
        {
          userId: user.id,
          action: "USER_LOGGED_IN",
          entityType: "user",
          entityId: user.id,
        },
      ],
    });
    console.log("Created sample activity log entries for user.");
  } else {
    console.log("Default user already exists:", DEFAULT_USER.email);
  }

  const userId = user.id;

  // --- Ensure default account exists first (CASH, cannot be deleted) ---
  let defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);
  if (!defaultAccount.isDefault) {
    const existingDefault = await prisma.financialAccount.findFirst({
      where: { userId, isDefault: true, isActive: true },
    });
    if (!existingDefault) {
      defaultAccount = await prisma.financialAccount.create({
        data: {
          userId,
          name: "บัญชีหลัก",
          type: "CASH",
          initialBalance: 0,
          isActive: true,
          isDefault: true,
        },
      });
      console.log("Created default account:", defaultAccount.name);
    } else {
      defaultAccount = existingDefault;
    }
  }
  if (defaultAccount.isDefault) {
    console.log("Default account ready:", defaultAccount.name);
  }

  // --- Phase 1: Bank Account(s) ---
  let bankAccount = await prisma.financialAccount.findFirst({
    where: { userId, type: "BANK", isActive: true },
  });
  if (!bankAccount) {
    const bank = pick(THAI_BANKS);
    bankAccount = await prisma.financialAccount.create({
      data: {
        userId,
        name: `บัญชี${bank.nameTh}`,
        type: "BANK",
        bankName: bank.id,
        accountNumber: randomAccountNumber(10),
        initialBalance: randomAmount(20000, 80000),
        isActive: true,
        isDefault: false,
      },
    });
    console.log("Created bank account:", bankAccount.name);
  } else {
    console.log("Bank account already exists:", bankAccount.name);
  }

  // --- Phase 1: Credit Card ---
  let creditCard = await prisma.financialAccount.findFirst({
    where: { userId, type: "CREDIT_CARD", isActive: true },
  });
  if (!creditCard) {
    const bank = pick(THAI_BANKS);
    const cardType = pick(
      CARD_TYPES.filter((c) => ["visa", "master", "jcb"].includes(c.id))
    );
    const statementClosingDay = pick([15, 25]);
    const dueDay = pick([5, 10]);
    creditCard = await prisma.financialAccount.create({
      data: {
        userId,
        name: `บัตรเครดิต${bank.nameTh}`,
        type: "CREDIT_CARD",
        bankName: bank.id,
        accountNumber: randomAccountNumber(16),
        initialBalance: 0,
        isActive: true,
        isDefault: false,
        creditLimit: randomAmount(30000, 80000),
        interestRate: randomAmount(15, 20),
        cardType: cardType.id,
        statementClosingDay,
        dueDay,
      },
    });
    console.log("Created credit card:", creditCard.name);
  } else {
    console.log("Credit card already exists:", creditCard.name);
  }

  // --- Phase 1: Categories ---
  const categoryMap: Record<string, { id: string; name: string }> = {};
  for (const name of DEFAULT_CATEGORY_NAMES) {
    const cat = await findOrCreateCategory(userId, name);
    categoryMap[name] = cat;
  }
  console.log("Categories ready:", Object.keys(categoryMap).length);

  // --- Idempotency: skip transactions if already seeded ---
  const existingTxCount = await prisma.transaction.count({
    where: { userId },
  });
  if (existingTxCount > 0) {
    console.log(
      `Skipping transaction seed (${existingTxCount} transactions already exist).`
    );
    return;
  }

  // --- Phase 2 & 3: Transactions for 270 days ---
  const today = startOfDay(new Date());
  const startDate = subDays(today, DAYS_BACK);
  const salaryAmount = randomAmount(25000, 45000);
  const rentAmount = randomAmount(
    EXPENSE_RANGES.housing.min,
    EXPENSE_RANGES.housing.max
  );
  const closingDay = creditCard.statementClosingDay ?? 15;
  const dueDay = creditCard.dueDay ?? 10;

  let totalTx = 0;
  const closedDates: Date[] = [];

  for (let d = 0; d <= DAYS_BACK; d++) {
    const dayStart = addDays(startDate, d);
    const dayEnd = endOfDay(dayStart);
    const txCount = randomInt(MIN_TX_PER_DAY, MAX_TX_PER_DAY);

    const txs: {
      type: "INCOME" | "EXPENSE";
      amount: number;
      financialAccountId: string;
      category: string;
      note: string | null;
      occurredAt: Date;
    }[] = [];

    const dayOfMonth = dayStart.getDate();
    const isSalaryDay = dayOfMonth === 15 || dayOfMonth === 25;

    if (isSalaryDay && Math.random() < 0.7) {
      txs.push({
        type: "INCOME",
        amount: salaryAmount,
        financialAccountId: bankAccount.id,
        category: "เงินเดือน",
        note: "เงินเดือน",
        occurredAt: dayStart,
      });
    }

    const rentDay = 1;
    if (dayOfMonth === rentDay && Math.random() < 0.8) {
      txs.push({
        type: "EXPENSE",
        amount: rentAmount,
        financialAccountId: bankAccount.id,
        category: "ค่าที่พัก",
        note: "ค่าเช่า",
        occurredAt: dayStart,
      });
    }

    const utilitiesDay = 5;
    if (dayOfMonth === utilitiesDay && Math.random() < 0.7) {
      txs.push({
        type: "EXPENSE",
        amount: randomAmount(
          EXPENSE_RANGES.utilities.min,
          EXPENSE_RANGES.utilities.max
        ),
        financialAccountId: bankAccount.id,
        category: "ค่าน้ำค่าไฟ",
        note: "ค่าน้ำค่าไฟ",
        occurredAt: dayStart,
      });
    }

    const remainingSlots = txCount - txs.length;
    for (let i = 0; i < remainingSlots; i++) {
      const useCreditCard = Math.random() < 0.4;
      const accountId = useCreditCard ? creditCard.id : bankAccount.id;

      const categoryChoice = pick([
        "อาหาร",
        "ค่าขนส่ง",
        "ช้อปปิ้ง",
        "ค่าอื่นๆ",
      ] as const);
      const range =
        categoryChoice === "อาหาร"
          ? EXPENSE_RANGES.food
          : categoryChoice === "ค่าขนส่ง"
            ? EXPENSE_RANGES.transport
            : categoryChoice === "ช้อปปิ้ง"
              ? EXPENSE_RANGES.shopping
              : EXPENSE_RANGES.other;

      txs.push({
        type: "EXPENSE",
        amount: randomAmount(range.min, range.max),
        financialAccountId: accountId,
        category: categoryChoice,
        note: null,
        occurredAt: new Date(
          dayStart.getTime() +
            Math.random() * (dayEnd.getTime() - dayStart.getTime())
        ),
      });
    }

    for (const tx of txs) {
      await prisma.transaction.create({
        data: {
          userId,
          type: tx.type as TransactionType,
          status: TransactionStatus.POSTED,
          amount: tx.amount,
          financialAccountId: tx.financialAccountId,
          category: tx.category,
          categoryId: categoryMap[tx.category]?.id ?? null,
          note: tx.note,
          occurredAt: tx.occurredAt,
          postedDate: tx.occurredAt,
        },
      });
      totalTx++;
    }

    if (creditCard && dayOfMonth === closingDay) {
      const closingDate = new Date(
        dayStart.getFullYear(),
        dayStart.getMonth(),
        closingDay
      );
      try {
        await closeStatement(creditCard.id, closingDate);
        closedDates.push(closingDate);
      } catch (e) {
        // Statement may already exist for this period
      }
    }

    await recomputeOutstanding(creditCard.id);
  }

  // --- Phase 3: Record payments for closed statements (oldest first) ---
  for (const closedDate of closedDates) {
    const paymentDate = addDays(closedDate, 2);
    if (paymentDate <= today) {
      try {
        const outstanding = await getCurrentOutstanding(creditCard.id);
        if (outstanding > 0) {
          const payRatio = 0.8 + Math.random() * 0.2;
          const toPay = Math.round(outstanding * payRatio * 100) / 100;
          if (toPay >= 1) {
            await recordPayment({
              userId,
              accountId: creditCard.id,
              amount: toPay,
              occurredAt: paymentDate,
              fromAccountId: bankAccount.id,
              note: "ชำระบัตรเครดิต",
            });
          }
        }
      } catch {
        // Ignore payment errors (e.g. already paid)
      }
    }
  }

  await recomputeOutstanding(creditCard.id);

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
