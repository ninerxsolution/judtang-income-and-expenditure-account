import { prisma } from "@/lib/prisma";

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

export async function createCategory(userId: string, name: string) {
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

  return prisma.category.create({
    data: { userId, name: trimmed },
  });
}

export async function updateCategory(userId: string, id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name is required");
  }

  const existing = await getCategoryById(userId, id);
  if (!existing) {
    throw new Error("Category not found");
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

  return prisma.category.update({
    where: { id },
    data: { name: trimmed },
  });
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await getCategoryById(userId, id);
  if (!existing) {
    return false;
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
