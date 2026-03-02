import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function PATCH(
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
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!account.isActive) {
    return NextResponse.json({ error: "Account is already disabled" }, { status: 400 });
  }

  if (account.isDefault) {
    return NextResponse.json(
      { error: "Cannot disable the default account" },
      { status: 400 }
    );
  }

  try {
    await prisma.financialAccount.update({
      where: { id },
      data: { isActive: false },
    });

    void createActivityLog({
      userId,
      action: ActivityLogAction.FINANCIAL_ACCOUNT_DISABLED,
      entityType: "financialAccount",
      entityId: id,
      details: { name: account.name, type: account.type },
    });

    revalidateTag("financial-accounts", "max");
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disable account" },
      { status: 500 }
    );
  }
}
