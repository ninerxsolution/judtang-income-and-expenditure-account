import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDailyExpenseByDateInRange } from "@/lib/transactions";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const excludedCategoryIds = (searchParams.get("excludedCategoryIds") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const getCached = unstable_cache(
      (uid: string, from: string, to: string, tz: string, excludedCsv: string) =>
        getDailyExpenseByDateInRange(
          uid,
          from,
          to,
          tz,
          excludedCsv
            .split(",")
            .map((x) => x.trim())
            .filter((x) => x.length > 0),
        ),
      cacheKey(
        "spending-efficiency",
        userId,
        fromParam,
        toParam,
        timezoneParam,
        excludedCategoryIds.join(","),
      ),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] },
    );
    const days = await getCached(
      userId,
      fromParam,
      toParam,
      timezoneParam,
      excludedCategoryIds.join(","),
    );
    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: "Failed to load spending efficiency data" }, { status: 500 });
  }
}
