import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { parseOccurredAt } from "@/lib/date-range";
import { createCrossCurrencyTransfer } from "@/lib/transactions";
import { revalidateTag } from "@/lib/cache";
import { isAccountIncomplete } from "@/lib/financial-accounts";
import { prisma } from "@/lib/prisma";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    fromAccountId?: string;
    toAccountId?: string;
    fromAmount?: number;
    toAmount?: number;
    bankRateThbPerForeignUnit?: number | null;
    occurredAt?: string;
    note?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fromAccountId =
    typeof body.fromAccountId === "string" ? body.fromAccountId.trim() : "";
  const toAccountId =
    typeof body.toAccountId === "string" ? body.toAccountId.trim() : "";

  if (!fromAccountId || !toAccountId) {
    return NextResponse.json(
      { error: "fromAccountId and toAccountId are required" },
      { status: 400 },
    );
  }

  const fromAmount =
    typeof body.fromAmount === "number"
      ? body.fromAmount
      : Number.parseFloat(String(body.fromAmount ?? ""));
  const toAmount =
    typeof body.toAmount === "number"
      ? body.toAmount
      : Number.parseFloat(String(body.toAmount ?? ""));
  const bankRaw = body.bankRateThbPerForeignUnit;
  const bankRateThbPerForeignUnit =
    bankRaw == null
      ? null
      : typeof bankRaw === "number"
        ? bankRaw
        : Number.parseFloat(String(bankRaw));

  const occurredAt = parseOccurredAt(body.occurredAt);

  for (const [label, n] of [
    ["fromAmount", fromAmount],
    ["toAmount", toAmount],
  ] as const) {
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json(
        { error: `${label} must be a positive number` },
        { status: 400 },
      );
    }
  }

  if (
    bankRateThbPerForeignUnit != null &&
    (!Number.isFinite(bankRateThbPerForeignUnit) || bankRateThbPerForeignUnit <= 0)
  ) {
    return NextResponse.json(
      { error: "bankRateThbPerForeignUnit must be a positive number when provided" },
      { status: 400 },
    );
  }

  const [fromAcc, toAcc] = await Promise.all([
    prisma.financialAccount.findFirst({
      where: { id: fromAccountId, userId },
      select: {
        type: true,
        bankName: true,
        accountNumber: true,
        creditLimit: true,
        interestRate: true,
        cardAccountType: true,
        cardNetwork: true,
        linkedAccountId: true,
      },
    }),
    prisma.financialAccount.findFirst({
      where: { id: toAccountId, userId },
      select: {
        type: true,
        bankName: true,
        accountNumber: true,
      },
    }),
  ]);

  if (!fromAcc || !toAcc) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (isAccountIncomplete(fromAcc) || isAccountIncomplete(toAcc)) {
    return NextResponse.json(
      {
        error:
          "One or both accounts are incomplete. Add bank and account number before transferring.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createCrossCurrencyTransfer({
      userId,
      fromAccountId,
      toAccountId,
      fromAmount,
      toAmount,
      bankRateThbPerForeignUnit,
      occurredAt,
      note: body.note ?? null,
    });
    revalidateTag("transactions", "max");
    revalidateTag("financial-accounts", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({
      transferGroupId: result.transferGroupId,
      legIds: result.legs.map((l) => l.id),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create transfer";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
