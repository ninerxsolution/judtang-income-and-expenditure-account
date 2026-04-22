import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { normalizeCurrencyCode } from "@/lib/currency";
import { fetchSuggestedThbPerUnit } from "@/lib/fx-rate";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("currency") ?? "THB";
  const currency = normalizeCurrencyCode(raw);

  try {
    const { thbPerUnit, fromApi } = await fetchSuggestedThbPerUnit(currency);
    return NextResponse.json({
      currency,
      thbPerUnit,
      fromApi,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load suggested rate" },
      { status: 500 },
    );
  }
}
