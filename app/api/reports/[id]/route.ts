import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ReportStatus } from "@prisma/client";

type SessionWithId = {
  user: { id?: string; role?: string };
  sessionId?: string;
};

const VALID_STATUSES: ReportStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "CLOSED",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
    },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let imagePaths: string[] = [];
  if (report.imagePaths) {
    try {
      imagePaths = JSON.parse(report.imagePaths) as string[];
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    id: report.id,
    category: report.category,
    title: report.title,
    description: report.description,
    route: report.route,
    appVersion: report.appVersion,
    browserInfo: report.browserInfo,
    ipAddress: report.ipAddress,
    status: report.status,
    imagePaths,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    user: report.user,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !VALID_STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await prisma.report.update({
    where: { id },
    data: { status: status as ReportStatus },
  });

  return NextResponse.json({
    id: report.id,
    status: report.status,
    updatedAt: report.updatedAt.toISOString(),
  });
}
