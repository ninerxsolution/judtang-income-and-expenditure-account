import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { applyTemplateToMonth } from "@/lib/budget";
import { createActivityLog } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { templateId?: string; year?: number; month?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  const year = body.year != null ? parseInt(String(body.year), 10) : NaN;
  const month = body.month != null ? parseInt(String(body.month), 10) : NaN;

  if (!templateId) {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Valid year and month (1-12) are required" },
      { status: 400 },
    );
  }

  try {
    const result = await applyTemplateToMonth(userId, templateId, year, month);
    await createActivityLog({
      userId,
      action: "BUDGET_MONTH_APPLIED_TEMPLATE",
      entityType: "budget_month",
      entityId: result.budgetMonthId,
      details: { templateId, year, month, appliedCategoryCount: result.appliedCategoryCount },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to apply template";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
