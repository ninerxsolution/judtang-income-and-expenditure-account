import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  saveAnnouncementImage,
  isAllowedAnnouncementImageType,
  getMaxAnnouncementImageSize,
} from "@/lib/announcement-storage";

type SessionWithId = {
  user: { id?: string; role?: string };
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!isAllowedAnnouncementImageType(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  if (file.size > getMaxAnnouncementImageSize()) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const { url } = await saveAnnouncementImage(file);
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_TYPE") {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (msg === "TOO_LARGE") {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }
    console.error("[POST /api/admin/announcement/image]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
