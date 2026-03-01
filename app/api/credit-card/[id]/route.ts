import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getCurrentOutstanding,
  getAvailableCredit,
  getLatestStatement,
} from "@/lib/credit-card";
import { differenceInDays } from "date-fns";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(
  _request: Request,
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
    select: {
      id: true,
      name: true,
      type: true,
      creditLimit: true,
      statementClosingDay: true,
      dueDay: true,
    },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [outstanding, available, latestStatement] = await Promise.all([
    getCurrentOutstanding(id),
    getAvailableCredit(id),
    getLatestStatement(id),
  ]);

  const creditLimit = account.creditLimit != null ? Number(account.creditLimit) : null;
  const utilization =
    creditLimit != null && creditLimit > 0
      ? Math.round((outstanding / creditLimit) * 100)
      : null;

  const now = new Date();
  let dueDate: string | null = null;
  let daysRemaining: number | null = null;

  if (latestStatement) {
    dueDate = latestStatement.dueDate.toISOString().slice(0, 10);
    daysRemaining = differenceInDays(latestStatement.dueDate, now);
  } else if (account.statementClosingDay != null && account.dueDay != null) {
    const closingDay = account.statementClosingDay;
    const dueDay = account.dueDay;
    let nextClosing = new Date(now.getFullYear(), now.getMonth(), closingDay);
    if (now.getDate() > closingDay) {
      nextClosing = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
    }
    let nextDue = new Date(nextClosing.getFullYear(), nextClosing.getMonth(), dueDay);
    if (dueDay <= closingDay) {
      nextDue = new Date(nextClosing.getFullYear(), nextClosing.getMonth() + 1, dueDay);
    }
    dueDate = nextDue.toISOString().slice(0, 10);
    daysRemaining = differenceInDays(nextDue, now);
  }

  return NextResponse.json({
    id: account.id,
    name: account.name,
    creditLimit,
    currentOutstanding: outstanding,
    availableCredit: available,
    statementBalance: latestStatement
      ? Number(latestStatement.statementBalance) - Number(latestStatement.paidAmount)
      : null,
    dueDate,
    daysRemaining,
    utilization,
    latestStatement: latestStatement
      ? {
          id: latestStatement.id,
          closingDate: latestStatement.closingDate.toISOString().slice(0, 10),
          dueDate: latestStatement.dueDate.toISOString().slice(0, 10),
          statementBalance: Number(latestStatement.statementBalance),
          paidAmount: Number(latestStatement.paidAmount),
          isPaid: latestStatement.isPaid,
        }
      : null,
  });
}
