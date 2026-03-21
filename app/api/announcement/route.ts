/**
 * GET: active announcement for the home page (public). Stored in DB (SiteAnnouncement).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rowToPublicAnnouncement } from "@/lib/site-announcement";

/** Always read DB; avoid CDN/browser caching stale config after admin saves. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, must-revalidate",
} as const;

export async function GET() {
  const row = await prisma.siteAnnouncement.findUnique({
    where: { id: "default" },
  });
  if (!row) {
    return NextResponse.json(null, { headers: NO_STORE_HEADERS });
  }
  const payload = rowToPublicAnnouncement(row);
  return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
}
