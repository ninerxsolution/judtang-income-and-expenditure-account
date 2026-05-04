import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { confirmRecurringTransaction } from "@/lib/recurring-transactions";
import { parseOccurredAt } from "@/lib/date-range";

type SessionWithId = { user: { id?: string } };
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: {
    dueYear?: number;
    dueMonth?: number;
    amount?: number;
    occurredAt?: string;
    financialAccountId?: string;
    categoryId?: string | null;
    note?: string | null;
    linkTransactionId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : Number.parseFloat(String(body.amount ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!body.financialAccountId) {
    return NextResponse.json({ error: "financialAccountId is required" }, { status: 400 });
  }

  if (!body.occurredAt) {
    return NextResponse.json({ error: "occurredAt is required" }, { status: 400 });
  }

  const dueYear = typeof body.dueYear === "number" ? body.dueYear : parseInt(String(body.dueYear ?? ""), 10);
  const dueMonth = typeof body.dueMonth === "number" ? body.dueMonth : parseInt(String(body.dueMonth ?? ""), 10);
  if (!Number.isInteger(dueYear) || !Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12) {
    return NextResponse.json({ error: "dueYear and dueMonth are required (dueMonth 1–12)" }, { status: 400 });
  }

  const linkRaw = body.linkTransactionId;
  const linkTransactionId =
    linkRaw != null && String(linkRaw).trim() !== "" ? String(linkRaw).trim() : null;

  try {
    const transaction = await confirmRecurringTransaction(userId, id, {
      dueYear,
      dueMonth,
      amount,
      occurredAt: parseOccurredAt(body.occurredAt),
      financialAccountId: body.financialAccountId,
      categoryId: body.categoryId ?? null,
      note: body.note ?? null,
      linkTransactionId,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
