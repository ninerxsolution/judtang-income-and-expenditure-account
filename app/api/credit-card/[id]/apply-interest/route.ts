import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionWithId = { user: { id?: string }; sessionId?: string };

/**
 * Apply interest for unpaid statement (v1.1 - not implemented).
 */
export async function POST(
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
    select: { type: true },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { error: "Interest calculation not yet implemented (v1.1)" },
    { status: 501 }
  );
}
