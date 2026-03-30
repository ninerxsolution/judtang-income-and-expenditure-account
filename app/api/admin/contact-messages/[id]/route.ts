/**
 * GET /api/admin/contact-messages/[id] — single contact message (ADMIN only).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionWithRole = { user: { id?: string; role?: string } };

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const session = (await getServerSession(authOptions)) as SessionWithRole | null;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const row = await prisma.contactMessage.findUnique({
    where: { id },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    topic: row.topic,
    subject: row.subject,
    message: row.message,
    senderEmail: row.senderEmail,
    senderName: row.senderName,
    uiLanguage: row.uiLanguage,
    ipAddress: row.ipAddress,
    browserInfo: row.browserInfo,
    emailSentAt: row.emailSentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}
