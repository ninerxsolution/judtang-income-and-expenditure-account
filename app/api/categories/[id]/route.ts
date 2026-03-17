import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  updateCategory,
  deleteCategory,
} from "@/lib/categories";
import { revalidateTag } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { name?: string; nameEn?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const nameEn = typeof body.nameEn === "string" ? body.nameEn : undefined;
  try {
    const category = await updateCategory(userId, id, name, nameEn);
    revalidateTag("categories", { expire: 0 });
    return NextResponse.json({
      id: category.id,
      name: category.name,
      nameEn: category.nameEn,
      createdAt: category.createdAt.toISOString(),
      isDefault: category.isDefault,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update category";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteCategory(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    revalidateTag("categories", { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete category";
    const status =
      msg === "Default categories cannot be deleted" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
