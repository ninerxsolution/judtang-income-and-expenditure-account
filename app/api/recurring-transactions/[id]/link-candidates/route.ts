import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  listRecurringLinkCandidates,
  type ListRecurringLinkCandidatesOptions,
} from "@/lib/recurring-transactions";

type SessionWithId = { user: { id?: string } };
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const dueYear = searchParams.get("dueYear");
  const dueMonth = searchParams.get("dueMonth");
  const year = dueYear != null ? parseInt(dueYear, 10) : NaN;
  const month = dueMonth != null ? parseInt(dueMonth, 10) : NaN;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid dueYear or dueMonth" }, { status: 400 });
  }

  const searchRaw = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const q = searchRaw.trim();
  const onDateRaw = searchParams.get("onDate")?.trim() ?? "";
  const limitParam = searchParams.get("limit");

  const options: ListRecurringLinkCandidatesOptions = {};
  if (q.length > 0) options.search = q;

  if (onDateRaw.length > 0) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(onDateRaw)) {
      return NextResponse.json({ error: "Invalid onDate (use YYYY-MM-DD)" }, { status: 400 });
    }
    options.onDate = onDateRaw;
  }

  if (limitParam != null && limitParam !== "") {
    const lim = Number.parseInt(limitParam, 10);
    if (!Number.isFinite(lim) || lim < 1 || lim > 50) {
      return NextResponse.json({ error: "Invalid limit (1–50)" }, { status: 400 });
    }
    options.limit = lim;
  }

  try {
    const items = await listRecurringLinkCandidates(userId, id, year, month, options);
    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list link candidates";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
