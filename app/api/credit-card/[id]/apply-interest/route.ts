import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { applyInterest } from "@/lib/credit-card/interest";

type SessionWithId = { user: { id?: string }; sessionId?: string };

/**
 * Apply interest for unpaid balance (v1.1).
 * Calculates interest from interestCalculatedUntil (or last statement / account start) to today,
 * creates an INTEREST transaction, and updates interestCalculatedUntil.
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

  try {
    const result = await applyInterest(id, userId);
    if (result.applied) {
      return NextResponse.json({
        applied: true,
        transactionId: result.transactionId,
        amount: result.amount,
      });
    }
    return NextResponse.json({
      applied: false,
      message: result.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to apply interest";
    if (message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message.includes("incomplete")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("Invalid interest rate")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
