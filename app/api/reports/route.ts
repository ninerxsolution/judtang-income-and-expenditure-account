import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendReportNotificationEmail } from "@/lib/email";
import {
  verifyTurnstileToken,
  shouldSkipTurnstileVerification,
} from "@/lib/turnstile";
import {
  checkReportRateLimit,
  incrementReportRateLimit,
} from "@/lib/report-rate-limit";
import {
  saveReportImage,
  isAllowedType,
  getMaxFileSize,
  getMaxFiles,
} from "@/lib/report-storage";
import type { ReportCategory, ReportStatus, Prisma } from "@prisma/client";

const CATEGORIES: ReportCategory[] = [
  "BUG",
  "CALCULATION_ISSUE",
  "DATA_MISMATCH",
  "UI_ISSUE",
  "FEATURE_REQUEST",
  "OTHER",
];
const TITLE_MIN = 5;
const TITLE_MAX = 200;
const DESC_MIN = 10;
const DESC_MAX = 5000;

type SessionWithId = {
  user: { id?: string; role?: string };
  sessionId?: string;
};

function getClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function getBrowserInfo(request: Request): string | null {
  return request.headers.get("user-agent") || null;
}

function getRoute(request: Request): string | null {
  return request.headers.get("referer") || request.headers.get("x-invoke-path") || null;
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!shouldSkipTurnstileVerification(request)) {
    const turnstileToken = formData.get("turnstileToken");
    if (!turnstileToken || typeof turnstileToken !== "string") {
      return NextResponse.json(
        { error: "Verification required" },
        { status: 400 }
      );
    }
    const result = await verifyTurnstileToken(
      turnstileToken,
      getClientIp(request)
    );
    if (!result.success) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }
  }

  const { allowed } = checkReportRateLimit(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      { status: 429 }
    );
  }

  const category = formData.get("category");
  const title = formData.get("title");
  const description = formData.get("description");

  if (
    !category ||
    typeof category !== "string" ||
    !CATEGORIES.includes(category as ReportCategory)
  ) {
    return NextResponse.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }

  const titleStr = typeof title === "string" ? title.trim() : "";
  if (titleStr.length < TITLE_MIN || titleStr.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Title must be ${TITLE_MIN}-${TITLE_MAX} characters` },
      { status: 400 }
    );
  }

  const descStr = typeof description === "string" ? description.trim() : "";
  if (descStr.length < DESC_MIN || descStr.length > DESC_MAX) {
    return NextResponse.json(
      { error: `Description must be ${DESC_MIN}-${DESC_MAX} characters` },
      { status: 400 }
    );
  }

  const imageFiles: File[] = [];
  const imagesField = formData.getAll("images");
  if (Array.isArray(imagesField)) {
    for (const item of imagesField) {
      if (item instanceof File && item.size > 0) {
        imageFiles.push(item);
      }
    }
  }
  if (imageFiles.length > getMaxFiles()) {
    return NextResponse.json(
      { error: `Maximum ${getMaxFiles()} images allowed` },
      { status: 400 }
    );
  }
  for (const file of imageFiles) {
    if (!isAllowedType(file.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > getMaxFileSize()) {
      return NextResponse.json(
        { error: "Each image must be 2MB or less" },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const userEmail = user?.email ?? "unknown";

  const appVersion =
    (process.env.APP_VERSION ?? "0.1.0") +
    (process.env.PATCH_VERSION ? ` (${process.env.PATCH_VERSION})` : "");

  const report = await prisma.report.create({
    data: {
      userId,
      category: category as ReportCategory,
      title: titleStr,
      description: descStr,
      route: getRoute(request)?.slice(0, 500) ?? null,
      appVersion: appVersion.slice(0, 50),
      browserInfo: getBrowserInfo(request),
      ipAddress: getClientIp(request)?.slice(0, 45) ?? null,
    },
  });

  const imagePaths: string[] = [];
  for (const file of imageFiles) {
    try {
      const path = await saveReportImage(report.id, file);
      imagePaths.push(path);
    } catch {
      // Log but don't fail the whole request
    }
  }
  if (imagePaths.length > 0) {
    await prisma.report.update({
      where: { id: report.id },
      data: { imagePaths: JSON.stringify(imagePaths) },
    });
  }

  incrementReportRateLimit(userId);

  const adminEmail = process.env.ADMIN_REPORT_EMAIL;
  if (adminEmail) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3910";
    const adminDetailUrl = `${baseUrl}/admin/reports/${report.id}`;
    try {
      await sendReportNotificationEmail(
        adminEmail,
        {
          id: report.id,
          category,
          title: titleStr,
          userEmail,
          description: descStr,
        },
        adminDetailUrl
      );
    } catch {
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({
    id: report.id,
    message: "Thank you. Your report has been submitted.",
  });
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const search = searchParams.get("search")?.trim();

  const where: Prisma.ReportWhereInput = {};
  if (status && ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"].includes(status)) {
    where.status = status as ReportStatus;
  }
  if (search && search.length > 0) {
    where.OR = [
      { title: { contains: search } },
      { user: { email: { contains: search } } },
    ];
  }

  const [reports, total, stats] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({ where }),
    prisma.report.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const statsMap = stats.reduce((acc, stat) => {
    acc[stat.status] = stat._count;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    stats: {
      total,
      open: statsMap.OPEN || 0,
      inReview: statsMap.IN_REVIEW || 0,
      resolved: statsMap.RESOLVED || 0,
      closed: statsMap.CLOSED || 0,
    },
    reports: reports.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
    total,
    page,
    limit,
  });
}
