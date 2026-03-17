import { prisma } from "@/lib/prisma";

export const DEFAULT_CATEGORY_NAMES = [
  "เงินเดือน",
  "อาหาร",
  "ค่าที่พัก",
  "ค่าน้ำค่าไฟ",
  "ค่าอินเทอร์เน็ต",
  "ค่าสมัครสมาชิก",
  "ช้อปปิ้ง",
  "อื่นๆ",
] as const;

export async function ensureUserHasDefaultCategories(userId: string): Promise<void> {
  for (const name of DEFAULT_CATEGORY_NAMES) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (existing) {
      if (!existing.isDefault) {
        await prisma.category.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
      }
    } else {
      await prisma.category.create({
        data: { userId, name, isDefault: true },
      });
    }
  }
}

export async function listCategoriesByUser(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function getCategoryById(userId: string, id: string) {
  return prisma.category.findFirst({
    where: { id, userId },
  });
}

export async function createCategory(
  userId: string,
  name: string,
  nameEn?: string | null
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name is required");
  }

  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: trimmed } },
  });

  if (existing) {
    throw new Error("Category with this name already exists");
  }

  const trimmedEn = typeof nameEn === "string" ? nameEn.trim() || null : null;
  return prisma.category.create({
    data: { userId, name: trimmed, nameEn: trimmedEn, isDefault: false },
  });
}

export async function updateCategory(
  userId: string,
  id: string,
  name: string,
  nameEn?: string | null
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name is required");
  }

  const existing = await getCategoryById(userId, id);
  if (!existing) {
    throw new Error("Category not found");
  }
  if (existing.isDefault) {
    throw new Error("Default categories cannot be edited");
  }

  const duplicate = await prisma.category.findFirst({
    where: {
      userId,
      name: trimmed,
      id: { not: id },
    },
  });

  if (duplicate) {
    throw new Error("Category with this name already exists");
  }

  const trimmedEn = typeof nameEn === "string" ? nameEn.trim() || null : null;
  return prisma.category.update({
    where: { id },
    data: { name: trimmed, nameEn: trimmedEn },
  });
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await getCategoryById(userId, id);
  if (!existing) {
    return false;
  }
  if (existing.isDefault) {
    throw new Error("Default categories cannot be deleted");
  }

  await prisma.transaction.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  await prisma.category.delete({
    where: { id },
  });

  return true;
}
