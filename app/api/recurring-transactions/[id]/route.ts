import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { RecurringFrequency } from "@prisma/client";
import {
  getRecurringTransactionById,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "@/lib/recurring-transactions";

type SessionWithId = { user: { id?: string } };
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await getRecurringTransactionById(userId, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: {
    name?: string;
    type?: string;
    amount?: number;
    categoryId?: string | null;
    financialAccountId?: string | null;
    frequency?: string;
    dayOfMonth?: number | null;
    monthOfYear?: number | null;
    startDate?: string;
    endDate?: string | null;
    isActive?: boolean;
    note?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateData: Parameters<typeof updateRecurringTransaction>[2] = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.type !== undefined) {
    const type = body.type.toUpperCase();
    if (!["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json({ error: "type must be INCOME or EXPENSE" }, { status: 400 });
    }
    updateData.type = type as "INCOME" | "EXPENSE";
  }
  if (body.amount !== undefined) updateData.amount = Number(body.amount);
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.financialAccountId !== undefined) updateData.financialAccountId = body.financialAccountId;
  if (body.frequency !== undefined) {
    const freq = body.frequency.toUpperCase();
    const validFrequencies = Object.values(RecurringFrequency) as string[];
    if (!validFrequencies.includes(freq)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }
    updateData.frequency = freq as RecurringFrequency;
  }
  if (body.dayOfMonth !== undefined) updateData.dayOfMonth = body.dayOfMonth;
  if (body.monthOfYear !== undefined) updateData.monthOfYear = body.monthOfYear;
  if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.note !== undefined) updateData.note = body.note;

  try {
    const updated = await updateRecurringTransaction(userId, id, updateData);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await deleteRecurringTransaction(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
