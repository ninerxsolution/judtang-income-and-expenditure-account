const mockCategoryFindUnique = jest.fn();
const mockCategoryFindFirst = jest.fn();
const mockCategoryCreate = jest.fn();
const mockCategoryUpdate = jest.fn();
const mockCategoryDelete = jest.fn();
const mockTransactionUpdateMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
      findFirst: (...args: unknown[]) => mockCategoryFindFirst(...args),
      create: (...args: unknown[]) => mockCategoryCreate(...args),
      update: (...args: unknown[]) => mockCategoryUpdate(...args),
      delete: (...args: unknown[]) => mockCategoryDelete(...args),
    },
    transaction: {
      updateMany: (...args: unknown[]) => mockTransactionUpdateMany(...args),
    },
  },
}));

import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../categories";

beforeEach(() => {
  jest.clearAllMocks();
  mockCategoryCreate.mockResolvedValue({
    id: "cat-1",
    userId: "user-1",
    name: "Custom",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockCategoryUpdate.mockResolvedValue({
    id: "cat-1",
    userId: "user-1",
    name: "Updated",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockTransactionUpdateMany.mockResolvedValue({ count: 0 });
  mockCategoryDelete.mockResolvedValue({});
});

describe("createCategory", () => {
  it("throws when name is empty", async () => {
    await expect(createCategory("user-1", "")).rejects.toThrow(
      "Category name is required"
    );
  });

  it("throws when name is only whitespace", async () => {
    await expect(createCategory("user-1", "   ")).rejects.toThrow(
      "Category name is required"
    );
  });

  it("throws when category with same name exists", async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id: "cat-existing",
      userId: "user-1",
      name: "Food",
      isDefault: false,
    });

    await expect(createCategory("user-1", "Food")).rejects.toThrow(
      "Category with this name already exists"
    );
    expect(mockCategoryCreate).not.toHaveBeenCalled();
  });

  it("creates category on success", async () => {
    mockCategoryFindUnique.mockResolvedValue(null);

    const result = await createCategory("user-1", "Custom");
    expect(result).toMatchObject({
      id: "cat-1",
      userId: "user-1",
      name: "Custom",
      isDefault: false,
    });
    expect(mockCategoryCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "Custom", isDefault: false },
    });
  });

  it("trims name before creating", async () => {
    mockCategoryFindUnique.mockResolvedValue(null);

    await createCategory("user-1", "  Custom  ");
    expect(mockCategoryCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "Custom", isDefault: false },
    });
  });
});

describe("updateCategory", () => {
  it("throws when name is empty", async () => {
    await expect(updateCategory("user-1", "cat-1", "")).rejects.toThrow(
      "Category name is required"
    );
  });

  it("throws when category not found", async () => {
    mockCategoryFindFirst.mockResolvedValue(null);

    await expect(updateCategory("user-1", "cat-nonexistent", "New Name")).rejects.toThrow(
      "Category not found"
    );
    expect(mockCategoryUpdate).not.toHaveBeenCalled();
  });

  it("throws when category is default", async () => {
    mockCategoryFindFirst
      .mockResolvedValueOnce({
        id: "cat-1",
        userId: "user-1",
        name: "Default",
        isDefault: true,
      });

    await expect(updateCategory("user-1", "cat-1", "New Name")).rejects.toThrow(
      "Default categories cannot be edited"
    );
    expect(mockCategoryUpdate).not.toHaveBeenCalled();
  });

  it("throws when new name duplicates another category", async () => {
    mockCategoryFindFirst
      .mockResolvedValueOnce({
        id: "cat-1",
        userId: "user-1",
        name: "Custom",
        isDefault: false,
      })
      .mockResolvedValueOnce({
        id: "cat-2",
        userId: "user-1",
        name: "Existing",
        isDefault: false,
      });

    await expect(updateCategory("user-1", "cat-1", "Existing")).rejects.toThrow(
      "Category with this name already exists"
    );
    expect(mockCategoryUpdate).not.toHaveBeenCalled();
  });

  it("updates category on success", async () => {
    mockCategoryFindFirst
      .mockResolvedValueOnce({
        id: "cat-1",
        userId: "user-1",
        name: "Custom",
        isDefault: false,
      })
      .mockResolvedValueOnce(null);

    const result = await updateCategory("user-1", "cat-1", "Updated");
    expect(result).toMatchObject({
      id: "cat-1",
      name: "Updated",
    });
    expect(mockCategoryUpdate).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: { name: "Updated" },
    });
  });
});

describe("deleteCategory", () => {
  it("returns false when category not found", async () => {
    mockCategoryFindFirst.mockResolvedValue(null);

    const result = await deleteCategory("user-1", "cat-nonexistent");
    expect(result).toBe(false);
    expect(mockCategoryDelete).not.toHaveBeenCalled();
  });

  it("throws when category is default", async () => {
    mockCategoryFindFirst.mockResolvedValue({
      id: "cat-1",
      userId: "user-1",
      name: "Default",
      isDefault: true,
    });

    await expect(deleteCategory("user-1", "cat-1")).rejects.toThrow(
      "Default categories cannot be deleted"
    );
    expect(mockCategoryDelete).not.toHaveBeenCalled();
  });

  it("deletes category on success", async () => {
    mockCategoryFindFirst.mockResolvedValue({
      id: "cat-1",
      userId: "user-1",
      name: "Custom",
      isDefault: false,
    });

    const result = await deleteCategory("user-1", "cat-1");
    expect(result).toBe(true);
    expect(mockTransactionUpdateMany).toHaveBeenCalledWith({
      where: { categoryId: "cat-1" },
      data: { categoryId: null },
    });
    expect(mockCategoryDelete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
  });
});
