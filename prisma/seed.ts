import "./load-env";
import bcrypt from "bcrypt";
import { subDays, addDays, subMonths, startOfDay } from "date-fns";
import { TransactionType, TransactionStatus, RecurringFrequency, type NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { THAI_BANKS, BANK_OTHER } from "../lib/thai-banks";
import { CARD_NETWORKS } from "../lib/card-types";
import {
  closeStatement,
  recordPayment,
  recomputeOutstanding,
  getCurrentOutstanding,
} from "../lib/credit-card";
import { ensureUserHasDefaultFinancialAccount } from "../lib/financial-accounts";
import { DEFAULT_CATEGORY_NAMES } from "../lib/categories";
import { createActivityLog } from "../lib/activity-log";
import { rebuildBalanceSnapshotsForFinancialAccountIds } from "../lib/transaction-balance-snapshot";

const RESET_FLAG = process.argv.includes("--reset");

const DEFAULT_USER = {
  email: "anna@example.com",
  name: "Anna",
  password: "password",
};

const CUSTOM_CATEGORY_NAMES = ["ของขวัญ", "ค่ารักษาพยาบาล", "เงินออม"] as const;

/** Thai category name -> English name for bilingual display */
const CATEGORY_NAME_EN: Record<string, string> = {
  "เงินเดือน": "Salary",
  "อาหาร": "Food",
  "ค่าที่พัก": "Housing",
  "ค่าน้ำค่าไฟ": "Utilities",
  "ค่าอินเทอร์เน็ต": "Internet",
  "ค่าสมัครสมาชิก": "Subscriptions",
  "ช้อปปิ้ง": "Shopping",
  "อื่นๆ": "Other",
  "ค่าอื่นๆ": "Other",
  "ของขวัญ": "Gifts",
  "ค่ารักษาพยาบาล": "Medical",
  "เงินออม": "Savings",
  "ดอกเบี้ย": "Interest",
  "ปรับยอด": "Adjustment",
};

const DAYS_BACK = 1000;

/** Realistic Thai note pools for an office-worker persona (Bangkok). */
const NOTES = {
  coffee: ["กาแฟร้าน Café Amazon", "Starbucks", "ชานมไข่มุก", "อเมริกาโน่เย็น", "กาแฟหน้าออฟฟิศ"],
  brunch: ["บรันช์ร้านโปรด", "กาแฟคาเฟ่วันหยุด", "ติ่มซำเช้าวันหยุด"],
  lunch: ["ข้าวกะเพราไก่ไข่ดาว", "ข้าวมันไก่", "ก๋วยเตี๋ยวเรือ", "ข้าวแกงโรงอาหาร", "ส้มตำไก่ย่าง", "ข้าวหมูกรอบ", "ข้าวผัดกุ้ง"],
  dinner: ["ข้าวเย็น 7-11", "สั่ง Grab Food", "ก๋วยเตี๋ยวเย็น", "ข้าวต้มร้านประจำ", "หมูกระทะกับเพื่อน"],
  grocery: ["ซื้อของเข้าบ้าน Tops", "Big C", "Lotus's", "ตลาดสดวันหยุด", "Makro"],
  familyMeal: ["เลี้ยงข้าวพ่อแม่", "พาครอบครัวกินบุฟเฟต์", "ดินเนอร์กับครอบครัว"],
  transport: ["ค่า BTS", "ค่า MRT", "Grab ไปทำงาน", "วินมอเตอร์ไซค์", "แท็กซี่กลับบ้าน"],
  shopOnline: ["Shopee", "Lazada", "สั่งของออนไลน์", "TikTok Shop"],
  shopStore: ["เสื้อผ้า Uniqlo", "รองเท้าผ้าใบ", "เครื่องสำอาง", "ของใช้ในบ้าน", "หูฟังใหม่"],
  hobby: ["ดูหนัง Major", "ร้านหนังสือ", "เติมเกม Steam", "อุปกรณ์ออกกำลังกาย", "คาเฟ่ถ่ายรูป", "บอร์ดเกมคาเฟ่"],
  travel: ["ที่พักต่างจังหวัด", "ตั๋วรถไฟไปเที่ยว", "ทริปสุดสัปดาห์", "ตั๋วเครื่องบินในประเทศ"],
  medical: ["ซื้อยาที่ร้านขายยา", "หาหมอคลินิก", "ทำฟัน", "ตรวจสุขภาพประจำปี", "วิตามินอาหารเสริม"],
  gift: ["ของขวัญวันเกิดเพื่อน", "ของฝากพ่อแม่", "ของขวัญปีใหม่", "ช่อดอกไม้"],
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

async function seedSiteAnnouncement(): Promise<void> {
  const existing = await prisma.siteAnnouncement.findUnique({
    where: { id: "default" },
  });
  if (existing) {
    return;
  }
  await prisma.siteAnnouncement.create({
    data: {
      id: "default",
      enabled: false,
      keySlug: "promo-2026-03",
      titleTh: "โปรโมชั่นใหม่",
      titleEn: "New Promotion",
      contentTh: "ข้อความตัวอย่างที่แสดงใน overlay ด้านล่าง",
      contentEn: "Optional text shown in dim overlay at bottom.",
      image: "/announcements/promo.png",
      imageAltTh: "แบนเนอร์โปรโมชั่น",
      imageAltEn: "Promotion banner",
      startAt: new Date("2026-03-01T00:00:00.000Z"),
      endAt: new Date("2026-03-31T00:00:00.000Z"),
      showOnce: false,
      dismissible: true,
      actionUrl: null,
      actionLabelTh: "ดูรายละเอียด",
      actionLabelEn: "Learn more",
    },
  });
  console.log("Seeded SiteAnnouncement (default row).");
}

async function seedRootAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.log("Skipping root admin seed (ADMIN_EMAIL or ADMIN_PASSWORD not set).");
    return;
  }
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (existingAdmin) {
    console.log("Root admin already exists:", existingAdmin.email);
    return;
  }
  const existingByEmail = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });
  if (existingByEmail) {
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { role: "ADMIN" },
    });
    console.log("Updated existing user to ADMIN:", adminEmail);
    return;
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Created root admin:", adminEmail);
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
          initialBalance: randomAmount(80000, 150000),
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
        initialBalance: randomAmount(80000, 150000),
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
  // Credit card: cardAccountType (credit/debit/prepaid) + cardNetwork (visa/master/jcb etc.)
  const paymentNetworks = CARD_NETWORKS.filter((c) => ["visa", "master", "jcb"].includes(c.id));
  const defaultNetwork = paymentNetworks[0] ?? CARD_NETWORKS[0];
  for (let i = creditCards.length; i < 2; i++) {
    const bank = THAI_BANKS[i + 3] ?? pick(THAI_BANKS);
    const cardNetwork = paymentNetworks.length > 0 ? pick(paymentNetworks) : defaultNetwork;
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
        cardAccountType: "credit",
        cardNetwork: cardNetwork.id,
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
          initialBalance: randomAmount(2000, 8000),
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
        initialBalance: randomAmount(2000, 6000),
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
    const nameEn = CATEGORY_NAME_EN[name] ?? null;
    const cat = existing ?? (await prisma.category.create({
      data: { userId, name, nameEn, isDefault: true },
    }));
    categoryMap[name] = cat;
  }
  for (const name of CUSTOM_CATEGORY_NAMES) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (!existing) {
      const nameEn = CATEGORY_NAME_EN[name] ?? null;
      const cat = await prisma.category.create({
        data: { userId, name, nameEn, isDefault: false },
      });
      categoryMap[name] = cat;
    } else {
      categoryMap[name] = existing;
    }
  }
  console.log("Categories ready:", Object.keys(categoryMap).length);
  return categoryMap;
}

/** Fills `accountBalanceAfter` / `transferAccountBalanceAfter` after bulk `prisma.transaction.create` in seed. */
async function rebuildTransactionBalanceSnapshotsForUser(userId: string): Promise<void> {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId },
    select: { id: true },
  });
  if (accounts.length === 0) return;
  await rebuildBalanceSnapshotsForFinancialAccountIds(
    userId,
    accounts.map((a) => a.id),
  );
  console.log(`Rebuilt balance-after snapshots for ${accounts.length} financial account(s).`);
}

async function seedTransactions(ctx: SeedContext): Promise<number> {
  const today = startOfDay(new Date());
  const startDate = subDays(today, DAYS_BACK);

  const bank = ctx.bankAccounts[0]!;
  const savings = ctx.bankAccounts[1] ?? bank;
  const wallet = ctx.walletAccounts[0];
  const card = ctx.creditCards[0];

  const salary = randomAmount(46000, 54000);
  const rent = randomAmount(8500, 11000);

  // Track asset balances in memory so demo accounts never go negative (no top-up rows needed).
  const balRows = await prisma.financialAccount.findMany({
    where: { userId: ctx.userId },
    select: { id: true, initialBalance: true },
  });
  const bal: Record<string, number> = {};
  for (const a of balRows) bal[a.id] = Number(a.initialBalance);

  let totalTx = 0;

  type DayTx = {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    accountId: string;
    transferAccountId?: string;
    category: string | null;
    note: string | null;
    occurredAt: Date;
    status: "PENDING" | "POSTED";
  };

  const time = (day: Date, hour: number): Date => {
    const d = new Date(day);
    d.setHours(hour, randomInt(0, 59), randomInt(0, 59), 0);
    return d;
  };

  // Persist one tx, keeping asset balances >= 0 (reroute bank-funded spend to card if ever short).
  const persist = async (tx: DayTx): Promise<void> => {
    const targetIsCard = !!card && tx.accountId === card.id;
    if (tx.type === "EXPENSE" && !targetIsCard && (bal[tx.accountId] ?? 0) < tx.amount) {
      if (card) {
        tx.accountId = card.id;
      } else {
        return;
      }
    }
    if (tx.type === "TRANSFER" && (bal[tx.accountId] ?? 0) < tx.amount) return;

    const onCard = !!card && tx.accountId === card.id;
    if (tx.type === "INCOME") {
      bal[tx.accountId] = (bal[tx.accountId] ?? 0) + tx.amount;
    } else if (tx.type === "EXPENSE" && !onCard) {
      bal[tx.accountId] = (bal[tx.accountId] ?? 0) - tx.amount;
    } else if (tx.type === "TRANSFER") {
      bal[tx.accountId] = (bal[tx.accountId] ?? 0) - tx.amount;
      bal[tx.transferAccountId!] = (bal[tx.transferAccountId!] ?? 0) + tx.amount;
    }

    const created = await prisma.transaction.create({
      data: {
        userId: ctx.userId,
        type: tx.type as TransactionType,
        status: tx.status === "PENDING" ? TransactionStatus.PENDING : TransactionStatus.POSTED,
        amount: tx.amount,
        financialAccountId: tx.accountId,
        transferAccountId: tx.type === "TRANSFER" ? tx.transferAccountId : null,
        category: tx.category,
        categoryId: tx.category ? ctx.categoryMap[tx.category]?.id ?? null : null,
        note: tx.note,
        occurredAt: tx.occurredAt,
        postedDate: tx.status === "POSTED" ? tx.occurredAt : null,
      },
    });
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
          accountName: bank.name,
        },
      });
    }
  };

  for (let d = 0; d <= DAYS_BACK; d++) {
    const dayStart = addDays(startDate, d);
    const dayOfMonth = dayStart.getDate();
    const dow = dayStart.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const month = dayStart.getMonth();
    const txs: DayTx[] = [];

    const expense = (
      category: string,
      note: string,
      min: number,
      max: number,
      hour: number,
      accountId: string = bank.id,
      status: "PENDING" | "POSTED" = "POSTED",
    ): void => {
      txs.push({
        type: "EXPENSE",
        amount: randomAmount(min, max),
        accountId,
        category,
        note,
        occurredAt: time(dayStart, hour),
        status,
      });
    };
    const smallSrc = (): string =>
      wallet && (bal[wallet.id] ?? 0) > 300 && Math.random() < 0.4 ? wallet.id : bank.id;

    // Income
    if (dayOfMonth === 25) {
      txs.push({ type: "INCOME", amount: salary, accountId: bank.id, category: "เงินเดือน", note: "เงินเดือน", occurredAt: time(dayStart, 9), status: "POSTED" });
      if (month === 11) {
        txs.push({ type: "INCOME", amount: randomAmount(salary * 0.8, salary * 1.5), accountId: bank.id, category: "เงินเดือน", note: "โบนัสประจำปี", occurredAt: time(dayStart, 9), status: "POSTED" });
      }
    }
    if (dayOfMonth === randomInt(6, 24) && Math.random() < 0.3) {
      txs.push({ type: "INCOME", amount: randomAmount(3000, 15000), accountId: bank.id, category: "เงินเดือน", note: pick(["รายได้ฟรีแลนซ์", "งานพิเศษนอกเวลา", "ขายของออนไลน์"]), occurredAt: time(dayStart, 20), status: "POSTED" });
    }
    if (dayOfMonth === 1 && (month === 5 || month === 11)) {
      txs.push({ type: "INCOME", amount: randomAmount(80, 400), accountId: savings.id, category: "ดอกเบี้ย", note: "ดอกเบี้ยเงินฝาก", occurredAt: time(dayStart, 6), status: "POSTED" });
    }

    // Transfers
    if (dayOfMonth === 26) {
      txs.push({ type: "TRANSFER", amount: randomAmount(4000, 6000), accountId: bank.id, transferAccountId: savings.id, category: null, note: "ออมเงินประจำเดือน", occurredAt: time(dayStart, 10), status: "POSTED" });
    }
    if (dayOfMonth === 2 && wallet) {
      txs.push({ type: "TRANSFER", amount: 1000, accountId: bank.id, transferAccountId: wallet.id, category: null, note: "เติมเงิน e-Wallet", occurredAt: time(dayStart, 8), status: "POSTED" });
    }

    // Monthly fixed expenses
    if (dayOfMonth === 1) expense("ค่าที่พัก", "ค่าเช่าหอพัก", rent, rent, 8);
    if (dayOfMonth === 5) {
      expense("ค่าน้ำค่าไฟ", "ค่าไฟฟ้า", 900, 2200, 11);
      expense("ค่าน้ำค่าไฟ", "ค่าน้ำประปา", 150, 380, 11);
      if (card) expense("ค่าสมัครสมาชิก", "Spotify Premium", 149, 149, 7, card.id);
    }
    if (dayOfMonth === 8) expense("ค่าอินเทอร์เน็ต", "ค่าเน็ตบ้าน AIS Fibre", 599, 599, 12);
    if (dayOfMonth === 12) expense("อื่นๆ", "ค่าโทรศัพท์มือถือ", 399, 699, 12);
    if (dayOfMonth === 15) expense("อื่นๆ", "ค่าสมาชิกฟิตเนส", 1200, 1200, 18);
    if (dayOfMonth === 20 && card) expense("ค่าสมัครสมาชิก", "Netflix", 419, 419, 21, card.id);
    if (dayOfMonth === 28) expense("อื่นๆ", "เงินให้พ่อแม่", 5000, 5000, 19);

    // Daily living
    if (!isWeekend) {
      if (Math.random() < 0.85) expense("อาหาร", pick(NOTES.coffee), 45, 130, 8, smallSrc());
      if (Math.random() < 0.92) expense("อาหาร", pick(NOTES.lunch), 60, 160, 12);
      if (Math.random() < 0.7) expense("อื่นๆ", pick(NOTES.transport), 30, 90, randomInt(17, 19));
      if (Math.random() < 0.45) expense("อาหาร", pick(NOTES.dinner), 70, 280, 19);
      if (Math.random() < 0.25) expense("อาหาร", pick(NOTES.coffee), 35, 90, 15, smallSrc());
      if (Math.random() < 0.12) expense("ช้อปปิ้ง", pick(NOTES.shopOnline), 200, 1800, 22, card?.id ?? bank.id);
    } else {
      if (Math.random() < 0.75) expense("อาหาร", pick(NOTES.brunch), 80, 260, 10);
      if (Math.random() < 0.5) expense("อาหาร", pick(NOTES.grocery), 350, 1600, 11);
      if (Math.random() < 0.55) expense("อื่นๆ", pick(NOTES.hobby), 150, 900, randomInt(14, 20));
      if (Math.random() < 0.35) expense("ช้อปปิ้ง", pick(NOTES.shopStore), 300, 2500, 16, card?.id ?? bank.id);
      if (Math.random() < 0.2) expense("อาหาร", pick(NOTES.familyMeal), 400, 1800, 18);
      if (Math.random() < 0.15) expense("อื่นๆ", pick(NOTES.transport), 80, 300, 13);
    }

    // Rare / lumpy
    if (Math.random() < 0.015) expense("ค่ารักษาพยาบาล", pick(NOTES.medical), 200, 2500, 14);
    if (Math.random() < 0.01) expense("อื่นๆ", pick(NOTES.travel), 1500, 9000, 9, card?.id ?? bank.id);
    if (Math.random() < 0.012) expense("ของขวัญ", pick(NOTES.gift), 200, 1500, 17, card?.id ?? bank.id);
    if (Math.random() < 0.02) expense("ช้อปปิ้ง", pick(NOTES.shopOnline), 300, 1500, 21, card?.id ?? bank.id, "PENDING");

    txs.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    for (const tx of txs) {
      await persist(tx);
    }

    for (const c of ctx.creditCards) {
      if (dayOfMonth === c.statementClosingDay) {
        const closingDate = new Date(dayStart.getFullYear(), dayStart.getMonth(), c.statementClosingDay);
        try {
          await closeStatement(c.id, closingDate);
        } catch {
          // Statement may already exist
        }
      }
      await recomputeOutstanding(c.id);
    }
  }

  // Pay closed statements (85-100% of outstanding) from the main bank.
  for (const c of ctx.creditCards) {
    const statements = await prisma.creditCardStatement.findMany({
      where: { accountId: c.id, isClosed: true, isPaid: false },
      orderBy: { closingDate: "asc" },
    });
    for (const stmt of statements) {
      const paymentDate = addDays(stmt.closingDate, 2);
      if (paymentDate <= today) {
        try {
          const outstanding = await getCurrentOutstanding(c.id);
          if (outstanding > 0) {
            const toPay = Math.round(outstanding * (0.85 + Math.random() * 0.15) * 100) / 100;
            if (toPay >= 1) {
              await recordPayment({
                userId: ctx.userId,
                accountId: c.id,
                amount: toPay,
                occurredAt: paymentDate,
                fromAccountId: bank.id,
                note: "ชำระค่าบัตรเครดิต",
              });
            }
          }
        } catch {
          // Ignore
        }
      }
    }
    await recomputeOutstanding(c.id);
  }

  // One interest charge last month.
  if (card) {
    const interestTx = await prisma.transaction.findFirst({
      where: { financialAccountId: card.id, type: "INTEREST" },
    });
    if (!interestTx) {
      const lastMonth = subDays(today, 35);
      await prisma.transaction.create({
        data: {
          userId: ctx.userId,
          type: TransactionType.INTEREST,
          status: TransactionStatus.POSTED,
          amount: randomAmount(50, 200),
          financialAccountId: card.id,
          category: "ดอกเบี้ย",
          note: "ดอกเบี้ยบัตรเครดิต",
          occurredAt: lastMonth,
          postedDate: lastMonth,
        },
      });
      totalTx++;
      await recomputeOutstanding(card.id);
    }
  }

  // A refunded / cancelled purchase -> VOID.
  const voidCandidates = await prisma.transaction.findMany({
    where: { userId: ctx.userId, type: "EXPENSE", status: TransactionStatus.POSTED, category: "ช้อปปิ้ง" },
    take: 3,
    orderBy: { occurredAt: "desc" },
  });
  for (const tx of voidCandidates) {
    if (Math.random() < 0.4) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: TransactionStatus.VOID, note: "ยกเลิก/คืนเงินสินค้า" },
      });
    }
  }

  // Card balance adjustment (e.g. dispute reversal).
  if (card) {
    const hasAdjustment = await prisma.transaction.findFirst({
      where: { financialAccountId: card.id, type: "ADJUSTMENT" },
    });
    if (!hasAdjustment) {
      const adjDate = subDays(today, 60);
      await prisma.transaction.create({
        data: {
          userId: ctx.userId,
          type: TransactionType.ADJUSTMENT,
          status: TransactionStatus.POSTED,
          amount: randomAmount(10, 50),
          financialAccountId: card.id,
          category: "ปรับยอด",
          note: "ปรับยอดบัตรเครดิต",
          occurredAt: adjDate,
          postedDate: adjDate,
        },
      });
      totalTx++;
      await recomputeOutstanding(card.id);
    }
  }

  // History on the now-closed account.
  if (ctx.disabledAccountIds.length > 0) {
    for (const accId of ctx.disabledAccountIds) {
      for (let i = 0; i < 3; i++) {
        const when = addDays(startDate, randomInt(20, 90));
        await prisma.transaction.create({
          data: {
            userId: ctx.userId,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.POSTED,
            amount: randomAmount(80, 600),
            financialAccountId: accId,
            category: "อาหาร",
            note: pick(["ร้านอาหารตามสั่ง", "ซื้อของใช้", "ค่ากาแฟ"]),
            occurredAt: when,
            postedDate: when,
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

async function seedTermsAcceptance(userId: string): Promise<void> {
  const existing = await prisma.userTermsAcceptance.findFirst({
    where: { userId, termsVersion: "1.0" },
  });
  if (!existing) {
    await prisma.userTermsAcceptance.create({
      data: { userId, termsVersion: "1.0" },
    });
    console.log("Created terms acceptance (1.0).");
  }
}

async function seedRecurringTransactions(ctx: SeedContext): Promise<void> {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { userId: ctx.userId },
  });
  if (existing) {
    console.log("Recurring transactions already exist.");
    return;
  }

  const primaryBank = ctx.bankAccounts[0];
  if (!primaryBank) return;

  const startDate = subDays(startOfDay(new Date()), 270);
  const endDatePast = subDays(startOfDay(new Date()), 400);

  const salaryCatId = ctx.categoryMap["เงินเดือน"]?.id ?? null;
  const rentCatId = ctx.categoryMap["ค่าที่พัก"]?.id ?? null;
  const utilitiesCatId = ctx.categoryMap["ค่าน้ำค่าไฟ"]?.id ?? null;
  const internetCatId = ctx.categoryMap["ค่าอินเทอร์เน็ต"]?.id ?? null;
  const foodCatId = ctx.categoryMap["อาหาร"]?.id ?? null;
  const otherCatId = ctx.categoryMap["ค่าอื่นๆ"]?.id ?? null;

  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId: ctx.userId,
        name: "เงินเดือน",
        type: "INCOME",
        amount: 35000,
        categoryId: salaryCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.MONTHLY,
        dayOfMonth: 25,
        monthOfYear: null,
        startDate,
        endDate: null,
        isActive: true,
        note: "เงินเดือน",
      },
      {
        userId: ctx.userId,
        name: "ค่าเช่า",
        type: "EXPENSE",
        amount: 8000,
        categoryId: rentCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.MONTHLY,
        dayOfMonth: 1,
        monthOfYear: null,
        startDate,
        endDate: null,
        isActive: true,
        note: "ค่าเช่า",
      },
      {
        userId: ctx.userId,
        name: "ค่าน้ำค่าไฟ",
        type: "EXPENSE",
        amount: 1200,
        categoryId: utilitiesCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.MONTHLY,
        dayOfMonth: 5,
        monthOfYear: null,
        startDate,
        endDate: null,
        isActive: true,
        note: "ค่าน้ำค่าไฟ",
      },
      {
        userId: ctx.userId,
        name: "ค่าอินเทอร์เน็ต",
        type: "EXPENSE",
        amount: 799,
        categoryId: internetCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.MONTHLY,
        dayOfMonth: 8,
        monthOfYear: null,
        startDate,
        endDate: null,
        isActive: true,
        note: "ค่าอินเทอร์เน็ต",
      },
      {
        userId: ctx.userId,
        name: "ค่าอาหารรายสัปดาห์",
        type: "EXPENSE",
        amount: 800,
        categoryId: foodCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.WEEKLY,
        dayOfMonth: null,
        monthOfYear: null,
        startDate,
        endDate: null,
        isActive: true,
        note: "ค่าอาหารรายสัปดาห์",
      },
      {
        userId: ctx.userId,
        name: "ประกันชีวิต",
        type: "EXPENSE",
        amount: 15000,
        categoryId: otherCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.YEARLY,
        dayOfMonth: 1,
        monthOfYear: 7,
        startDate,
        endDate: null,
        isActive: true,
        note: "ประกันชีวิตรายปี",
      },
      {
        userId: ctx.userId,
        name: "ค่าสมาชิกยิม",
        type: "EXPENSE",
        amount: 599,
        categoryId: otherCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.MONTHLY,
        dayOfMonth: 15,
        monthOfYear: null,
        startDate,
        endDate: null,
        isActive: false,
        note: "ยกเลิกแล้ว",
      },
      {
        userId: ctx.userId,
        name: "ค่าประกันรถ",
        type: "EXPENSE",
        amount: 12000,
        categoryId: otherCatId,
        financialAccountId: primaryBank.id,
        frequency: RecurringFrequency.YEARLY,
        dayOfMonth: 1,
        monthOfYear: 3,
        startDate,
        endDate: endDatePast,
        isActive: false,
        note: "หมดอายุ",
      },
    ],
  });
  console.log("Created 8 recurring transaction templates.");
}

async function seedBudgets(ctx: SeedContext): Promise<void> {
  const existing = await prisma.budgetTemplate.findFirst({
    where: { userId: ctx.userId },
  });
  if (existing) {
    console.log("Budget data already exists.");
    return;
  }

  const cat = (name: string) => ctx.categoryMap[name]?.id ?? null;
  const standardLimits = [
    { categoryId: cat("อาหาร"), limitAmount: 6000 },
    { categoryId: cat("ช้อปปิ้ง"), limitAmount: 3500 },
    { categoryId: cat("ค่าน้ำค่าไฟ"), limitAmount: 1500 },
    { categoryId: cat("ค่าอินเทอร์เน็ต"), limitAmount: 800 },
    { categoryId: cat("ค่าอื่นๆ"), limitAmount: 2000 },
  ].filter((r) => r.categoryId != null) as { categoryId: string; limitAmount: number }[];

  const savingLimits = [
    { categoryId: cat("อาหาร"), limitAmount: 4000 },
    { categoryId: cat("ช้อปปิ้ง"), limitAmount: 1500 },
    { categoryId: cat("ค่าน้ำค่าไฟ"), limitAmount: 1200 },
    { categoryId: cat("ค่าอินเทอร์เน็ต"), limitAmount: 700 },
  ].filter((r) => r.categoryId != null) as { categoryId: string; limitAmount: number }[];

  await prisma.budgetTemplate.create({
    data: {
      userId: ctx.userId,
      name: "งบประมาณรายเดือน",
      isActive: true,
      totalBudget: 35000,
      categoryLimits: {
        create: standardLimits.map((r) => ({
          categoryId: r.categoryId,
          limitAmount: r.limitAmount,
        })),
      },
    },
  });
  await prisma.budgetTemplate.create({
    data: {
      userId: ctx.userId,
      name: "งบประมาณประหยัด",
      isActive: true,
      totalBudget: 22000,
      categoryLimits: {
        create: savingLimits.map((r) => ({
          categoryId: r.categoryId,
          limitAmount: r.limitAmount,
        })),
      },
    },
  });
  console.log("Created 2 budget templates.");

  const today = new Date();
  const months: { year: number; month: number; totalBudget: number | null; categoryLimits: { categoryId: string; limitAmount: number }[] }[] = [];

  for (let i = 0; i < 5; i++) {
    const d = subMonths(today, i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    if (i === 0) {
      months.push({
        year,
        month,
        totalBudget: 8000,
        categoryLimits: [
          { categoryId: cat("อาหาร")!, limitAmount: 2000 },
          { categoryId: cat("ช้อปปิ้ง")!, limitAmount: 500 },
        ].filter((r) => r.categoryId != null) as { categoryId: string; limitAmount: number }[],
      });
    } else if (i === 1) {
      months.push({
        year,
        month,
        totalBudget: 20000,
        categoryLimits: [
          { categoryId: cat("อาหาร")!, limitAmount: 4500 },
          { categoryId: cat("ช้อปปิ้ง")!, limitAmount: 2500 },
          { categoryId: cat("ค่าน้ำค่าไฟ")!, limitAmount: 1200 },
          { categoryId: cat("ค่าอื่นๆ")!, limitAmount: 1500 },
        ].filter((r) => r.categoryId != null) as { categoryId: string; limitAmount: number }[],
      });
    } else if (i === 2) {
      months.push({
        year,
        month,
        totalBudget: 35000,
        categoryLimits: standardLimits,
      });
    } else if (i === 3) {
      months.push({
        year,
        month,
        totalBudget: null,
        categoryLimits: standardLimits,
      });
    } else {
      months.push({
        year,
        month,
        totalBudget: 35000,
        categoryLimits: standardLimits,
      });
    }
  }

  for (const m of months) {
    const budgetMonth = await prisma.budgetMonth.create({
      data: {
        userId: ctx.userId,
        year: m.year,
        month: m.month,
        totalBudget: m.totalBudget,
        categoryBudgets: {
          create: m.categoryLimits.map((r) => ({
            categoryId: r.categoryId,
            limitAmount: r.limitAmount,
          })),
        },
      },
    });
    void budgetMonth;
  }
  console.log("Created 5 budget months.");
}

/**
 * Seeds backdated in-app notifications so the bell panel has realistic history
 * (today / earlier grouping, read + unread, varied severity).
 *
 * We seed EVENT_* types because the alert generator auto-resolves only *unread*
 * ALERT_* rows whose condition no longer holds — so seeded unread alerts would
 * vanish on the first dashboard load. Live alerts (recurring due, budget over,
 * card due, …) are produced automatically by generateNotifications from Anna's
 * seeded data. One *read* past-month budget alert is added as history.
 *
 * Requires the schema migration to be applied first (new NotificationType
 * values); if it isn't, this logs a hint and skips rather than failing the seed.
 */
async function seedNotifications(userId: string): Promise<void> {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000);
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000);
  const daysAgo = (d: number) => new Date(now - d * 86_400_000);

  const seeds: Array<{
    type: NotificationType;
    payload: Record<string, string | number | boolean>;
    link: string | null;
    createdAt: Date;
    read: boolean;
    dedupeKey?: string;
  }> = [
    { type: "EVENT_SLIP_DONE", payload: { createdCount: 3, totalCount: 3, hasErrors: false }, link: "/dashboard/transactions", createdAt: minsAgo(25), read: false },
    { type: "EVENT_CARD_PAYMENT", payload: { accountName: "KBank Visa", last4: "4821", amount: 4500 }, link: "/dashboard/accounts", createdAt: hoursAgo(3), read: false },
    { type: "EVENT_RECONCILE_MISMATCH", payload: { accountName: "บัญชีออมทรัพย์", difference: 320.5 }, link: "/dashboard/accounts", createdAt: hoursAgo(9), read: false },
    { type: "EVENT_IMPORT_DONE", payload: { createdCount: 42, updatedCount: 6, totalRows: 48 }, link: "/dashboard/transactions", createdAt: daysAgo(1), read: true },
    { type: "EVENT_CARD_STATEMENT_CLOSED", payload: { accountName: "KBank Visa", statementBalance: 18250, minimumPayment: 1000 }, link: "/dashboard/accounts", createdAt: daysAgo(2), read: false },
    { type: "EVENT_CARD_INTEREST_APPLIED", payload: { accountName: "Citi Cashback", amount: 215.75 }, link: "/dashboard/accounts", createdAt: daysAgo(3), read: true },
    { type: "EVENT_SECURITY_NEW_SIGN_IN", payload: { device: "Chrome on Windows" }, link: "/dashboard/settings/sessions", createdAt: daysAgo(4), read: true },
    { type: "ALERT_BUDGET", payload: { categoryName: "อาหาร", progress: 1.12, isOver: true, indicator: "over" }, link: "/dashboard/settings/budget", createdAt: daysAgo(5), read: true, dedupeKey: "budget-cat:seed-history:last-month" },
    { type: "EVENT_RECURRING_POSTED", payload: { name: "ค่าเช่าคอนโด" }, link: "/dashboard/recurring", createdAt: daysAgo(7), read: true },
    { type: "EVENT_EXPORT_DONE", payload: { count: 320 }, link: "/dashboard/transactions", createdAt: daysAgo(11), read: true },
    { type: "EVENT_REPORT_STATUS_CHANGED", payload: { status: "RESOLVED" }, link: "/dashboard/settings/feedback", createdAt: daysAgo(15), read: true },
    { type: "EVENT_ANNOUNCEMENT", payload: { message: "ยินดีต้อนรับสู่ Judtang เวอร์ชันใหม่" }, link: null, createdAt: daysAgo(22), read: true },
  ];

  try {
    for (const s of seeds) {
      await prisma.notification.create({
        data: {
          userId,
          type: s.type,
          payload: s.payload,
          link: s.link,
          dedupeKey: s.dedupeKey ?? null,
          createdAt: s.createdAt,
          readAt: s.read ? s.createdAt : null,
        },
      });
    }
    console.log(`Created ${seeds.length} backdated notifications.`);
  } catch (e) {
    console.warn(
      "Skipped notification seed — run `npx prisma migrate dev` first so the new NotificationType values exist:",
      e instanceof Error ? e.message : e,
    );
  }
}

async function resetSeedData(userId: string): Promise<void> {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.activityLog.deleteMany({ where: { userId } });
  await prisma.recurringTransaction.deleteMany({ where: { userId } });
  await prisma.budgetTemplate.deleteMany({ where: { userId } });
  await prisma.budgetMonth.deleteMany({ where: { userId } });
  await prisma.userTermsAcceptance.deleteMany({ where: { userId } });
  await prisma.financialAccount.deleteMany({
    where: { userId, isDefault: false },
  });
  console.log("Reset transactions, activity logs, recurring, budgets, terms, and non-default accounts.");
}

async function main() {
  await seedRootAdmin();
  await seedSiteAnnouncement();
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
  await rebuildTransactionBalanceSnapshotsForUser(userId);
  await seedDisabledAccounts(ctx);
  await seedTermsAcceptance(userId);
  await seedRecurringTransactions(ctx);
  await seedBudgets(ctx);
  await seedNotifications(userId);

  console.log(
    `Seed done: ${totalTx} transactions over ${DAYS_BACK} days, budgets, recurring templates, terms.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
