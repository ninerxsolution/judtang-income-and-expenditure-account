/**
 * GET: returns the active announcement config from data/announcement.json.
 * Returns null if disabled, file missing, or outside the date range.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Announcement } from "@/lib/announcement";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "announcement.json");

  let data: Announcement;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw) as Announcement;
  } catch {
    return NextResponse.json(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (data.start_at && today < data.start_at) {
    return NextResponse.json(null);
  }
  if (data.end_at && today > data.end_at) {
    return NextResponse.json(null);
  }

  return NextResponse.json(data);
}
