import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getImageAbsolutePath } from "@/lib/report-storage";
import { readFile } from "fs/promises";
import path from "path";

type SessionWithId = {
  user: { id?: string; role?: string };
  sessionId?: string;
};

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, filename } = await params;
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: { imagePaths: true },
  });
  if (!report || !report.imagePaths) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let imagePaths: string[] = [];
  try {
    imagePaths = JSON.parse(report.imagePaths) as string[];
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const relativePath = `report/image/${filename}`;
  if (!imagePaths.includes(relativePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const absolutePath = getImageAbsolutePath(relativePath);
    const buffer = await readFile(absolutePath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mime = MIME_MAP[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
