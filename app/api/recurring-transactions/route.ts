import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { RecurringFrequency } from "@prisma/client";
import {
  createRecurringTransaction,
  listRecurringTransactions,
  getDueRecurringTransactions,
} from "@/lib/recurring-transactions";

type SessionWithId = { user: { id?: string } };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dueYear = searchParams.get("dueYear");
  const dueMonth = searchParams.get("dueMonth");

  if (dueYear && dueMonth) {
    const year = parseInt(dueYear, 10);
    const month = parseInt(dueMonth, 10);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid dueYear or dueMonth" }, { status: 400 });
    }
    const items = await getDueRecurringTransactions(userId, year, month);
    return NextResponse.json(items);
  }

  const items = await listRecurringTransactions(userId);
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    type?: string;
    amount?: number;
    categoryId?: string | null;
    financialAccountId?: string | null;
    frequency?: string;
    dayOfMonth?: number | null;
    monthOfYear?: number | null;
    startDate?: string;
    endDate?: string | null;
    note?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type.toUpperCase() : "";
  if (!["INCOME", "EXPENSE"].includes(type)) {
    return NextResponse.json({ error: "type must be INCOME or EXPENSE" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : Number.parseFloat(String(body.amount ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const validFrequencies = Object.values(RecurringFrequency) as string[];
  const frequency = typeof body.frequency === "string" ? body.frequency.toUpperCase() : "";
  if (!validFrequencies.includes(frequency)) {
    return NextResponse.json({ error: "frequency must be WEEKLY, MONTHLY, or YEARLY" }, { status: 400 });
  }

  if (!body.startDate) {
    return NextResponse.json({ error: "startDate is required" }, { status: 400 });
  }

  try {
    const recurring = await createRecurringTransaction({
      userId,
      name: body.name.trim(),
      type: type as "INCOME" | "EXPENSE",
      amount,
      categoryId: body.categoryId ?? null,
      financialAccountId: body.financialAccountId ?? null,
      frequency: frequency as RecurringFrequency,
      dayOfMonth: body.dayOfMonth ?? null,
      monthOfYear: body.monthOfYear ?? null,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      note: body.note ?? null,
    });
    return NextResponse.json(recurring, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create recurring transaction";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
