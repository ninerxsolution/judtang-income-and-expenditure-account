import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import {
  getAnnouncementImageAbsolutePath,
  isSafeAnnouncementImageFilename,
} from "@/lib/announcement-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Public read for uploaded announcement images (storage/announcement/image/).
 * Also reachable as /storage/announcement/image/:filename via next.config rewrites.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename || !isSafeAnnouncementImageFilename(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const absolutePath = getAnnouncementImageAbsolutePath(filename);
    const buffer = await readFile(absolutePath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mime = MIME_MAP[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
