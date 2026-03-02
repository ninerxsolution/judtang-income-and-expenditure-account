import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  listCategoriesByUser,
  createCategory,
  ensureUserHasDefaultCategories,
} from "@/lib/categories";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey, revalidateTag } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

async function fetchCategoriesList(userId: string): Promise<{ id: string; name: string; createdAt: string; isDefault: boolean }[]> {
  const categories = await listCategoriesByUser(userId);
  type CategoryItem = (typeof categories)[number];
  return categories.map((c: CategoryItem) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
    isDefault: c.isDefault,
  }));
}

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserHasDefaultCategories(userId);
    const getCached = unstable_cache(
      (uid: string) => fetchCategoriesList(uid),
      cacheKey("categories", userId),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["categories"] },
    );
    const data = await getCached(userId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
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

  try {
    const category = await createCategory(userId, name);
    revalidateTag("categories", "max");
    return NextResponse.json({
      id: category.id,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
      isDefault: category.isDefault,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create category";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
