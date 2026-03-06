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
    amount?: number;
    occurredAt?: string;
    financialAccountId?: string;
    categoryId?: string | null;
    note?: string | null;
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

  try {
    const transaction = await confirmRecurringTransaction(userId, id, {
      amount,
      occurredAt: parseOccurredAt(body.occurredAt),
      financialAccountId: body.financialAccountId,
      categoryId: body.categoryId ?? null,
      note: body.note ?? null,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
