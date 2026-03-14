import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/credit-card";
import { revalidateTag } from "@/lib/cache";
import { parseOccurredAt } from "@/lib/date-range";
import { createNotification } from "@/lib/notifications";

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
    select: { type: true, name: true, accountNumber: true },
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

  const occurredAt = parseOccurredAt(body.occurredAt);

  try {
    const transaction = await recordPayment({
      userId,
      accountId: id,
      amount,
      occurredAt,
      fromAccountId: body.fromAccountId,
      note: body.note,
    });

    void createNotification(
      userId,
      "EVENT_CARD_PAYMENT",
      {
        accountId: id,
        accountName: account.name,
        last4: account.accountNumber ? account.accountNumber.slice(-4) : null,
        amount,
        occurredAt: occurredAt.toISOString(),
      },
      `/dashboard/accounts/${id}`,
    );

    revalidateTag("transactions", "max");
    revalidateTag("financial-accounts", "max");
    revalidateTag("dashboard-init", "max");
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
