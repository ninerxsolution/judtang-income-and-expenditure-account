import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/credit-card";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const account = await prisma.financialAccount.findFirst({
    where: { id, userId },
    select: { type: true },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { amount?: number; occurredAt?: string; fromAccountId?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount =
    typeof body.amount === "number"
      ? body.amount
      : Number.parseFloat(String(body.amount ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  let occurredAt = new Date();
  if (body.occurredAt) {
    const parsed = new Date(body.occurredAt);
    if (!Number.isNaN(parsed.getTime())) {
      occurredAt = parsed;
    }
  }

  try {
    const transaction = await recordPayment({
      userId,
      accountId: id,
      amount,
      occurredAt,
      fromAccountId: body.fromAccountId,
      note: body.note,
    });

    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
