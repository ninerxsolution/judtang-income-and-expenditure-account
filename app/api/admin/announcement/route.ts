import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO,
  parseAdminSiteAnnouncementPutBody,
  rowToAdminDto,
} from "@/lib/site-announcement";

type SessionWithId = {
  user: { id?: string; role?: string };
};

function isPrismaMissingAnnouncementTable(e: unknown): boolean {
  // P2021: table does not exist (sync schema with `npm run db:push`)
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021";
}

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const row = await prisma.siteAnnouncement.findUnique({
      where: { id: "default" },
    });
    if (!row) {
      return NextResponse.json(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
    }
    return NextResponse.json(rowToAdminDto(row));
  } catch (e) {
    if (isPrismaMissingAnnouncementTable(e)) {
      return NextResponse.json(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
    }
    console.error("[GET /api/admin/announcement]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", fieldErrors: { form: "invalidJson" } },
      { status: 400 }
    );
  }

  const parsed = parseAdminSiteAnnouncementPutBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message, fieldErrors: parsed.fieldErrors },
      { status: 400 }
    );
  }

  const d = parsed.data;

  try {
    const row = await prisma.siteAnnouncement.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        enabled: d.enabled,
        keySlug: d.keySlug,
        titleTh: d.titleTh,
        titleEn: d.titleEn,
        contentTh: d.contentTh.trim() ? d.contentTh : null,
        contentEn: d.contentEn.trim() ? d.contentEn : null,
        image: d.image,
        imageAltTh: d.imageAltTh.trim() ? d.imageAltTh : null,
        imageAltEn: d.imageAltEn.trim() ? d.imageAltEn : null,
        startAt: d.startAt,
        endAt: d.endAt,
        showOnce: d.showOnce,
        dismissible: d.dismissible,
        actionUrl: d.actionUrl,
        actionLabelTh: d.actionLabelTh.trim() ? d.actionLabelTh : null,
        actionLabelEn: d.actionLabelEn.trim() ? d.actionLabelEn : null,
      },
      update: {
        enabled: d.enabled,
        keySlug: d.keySlug,
        titleTh: d.titleTh,
        titleEn: d.titleEn,
        contentTh: d.contentTh.trim() ? d.contentTh : null,
        contentEn: d.contentEn.trim() ? d.contentEn : null,
        image: d.image,
        imageAltTh: d.imageAltTh.trim() ? d.imageAltTh : null,
        imageAltEn: d.imageAltEn.trim() ? d.imageAltEn : null,
        startAt: d.startAt,
        endAt: d.endAt,
        showOnce: d.showOnce,
        dismissible: d.dismissible,
        actionUrl: d.actionUrl,
        actionLabelTh: d.actionLabelTh.trim() ? d.actionLabelTh : null,
        actionLabelEn: d.actionLabelEn.trim() ? d.actionLabelEn : null,
      },
    });

    return NextResponse.json(rowToAdminDto(row));
  } catch (e) {
    if (isPrismaMissingAnnouncementTable(e)) {
      return NextResponse.json(
        { error: "SITE_ANNOUNCEMENT_TABLE_MISSING", code: "DB_SCHEMA" },
        { status: 503 }
      );
    }
    console.error("[PUT /api/admin/announcement]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
