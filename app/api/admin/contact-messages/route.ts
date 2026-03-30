/**
 * GET /api/admin/contact-messages — list public contact submissions (ADMIN only).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type SessionWithRole = { user: { id?: string; role?: string } };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithRole | null;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const search = searchParams.get("search")?.trim();

  const where: Prisma.ContactMessageWhereInput = {};
  if (search && search.length > 0) {
    where.OR = [
      { subject: { contains: search } },
      { senderEmail: { contains: search } },
      { message: { contains: search } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        topic: true,
        subject: true,
        senderEmail: true,
        senderName: true,
        emailSentAt: true,
        createdAt: true,
      },
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return NextResponse.json({
    messages: rows.map((m) => ({
      id: m.id,
      topic: m.topic,
      subject: m.subject,
      senderEmail: m.senderEmail,
      senderName: m.senderName,
      emailSent: m.emailSentAt != null,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  });
}
