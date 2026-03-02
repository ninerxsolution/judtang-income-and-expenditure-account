import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { closeStatement } from "@/lib/credit-card";
import { revalidateTag } from "@/lib/cache";

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
    select: { type: true, statementClosingDay: true },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { closingDate?: string } = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      body = parsed;
    }
  } catch {
    // Empty or invalid body - use default
  }

  let closingDate: Date;
  if (body.closingDate) {
    const parsed = new Date(body.closingDate);
    if (!Number.isNaN(parsed.getTime())) {
      closingDate = parsed;
    } else {
      closingDate = new Date();
    }
  } else if (account.statementClosingDay != null) {
    const now = new Date();
    const today = now.getDate();
    if (today >= account.statementClosingDay) {
      closingDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        account.statementClosingDay
      );
    } else {
      closingDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        account.statementClosingDay
      );
    }
  } else {
    closingDate = new Date();
  }

  try {
    const result = await closeStatement(id, closingDate);
    revalidateTag("financial-accounts", "max");
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({ id: result.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to close statement";
    const status =
      msg.includes("already closed") || msg.includes("Statement already closed")
        ? 409
        : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
