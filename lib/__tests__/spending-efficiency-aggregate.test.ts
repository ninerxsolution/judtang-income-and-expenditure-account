const mockTransactionFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: (...args: unknown[]) => mockTransactionFindMany(...args),
    },
  },
}));

import { getDailyExpenseByDateInRange } from "../transactions";

describe("getDailyExpenseByDateInRange", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a day row for each day in range with zeros filled", async () => {
    mockTransactionFindMany.mockResolvedValue([
      {
        occurredAt: new Date("2026-04-01T12:00:00.000Z"),
        amount: 100,
        currency: "THB",
        exchangeRate: 1,
        baseAmount: 100,
      },
      {
        occurredAt: new Date("2026-04-03T12:00:00.000Z"),
        amount: 50,
        currency: "THB",
        exchangeRate: 1,
        baseAmount: 50,
      },
    ]);

    const rows = await getDailyExpenseByDateInRange(
      "user-1",
      "2026-04-01",
      "2026-04-03",
      "Asia/Bangkok",
      [],
    );

    expect(rows).toEqual([
      { date: "2026-04-01", spent: 100 },
      { date: "2026-04-02", spent: 0 },
      { date: "2026-04-03", spent: 50 },
    ]);
  });

  it("adds exclude-category predicate when excluded ids are provided", async () => {
    mockTransactionFindMany.mockResolvedValue([]);

    await getDailyExpenseByDateInRange(
      "user-1",
      "2026-04-01",
      "2026-04-01",
      "Asia/Bangkok",
      ["cat-1", "cat-2"],
    );

    expect(mockTransactionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { categoryId: null },
            { categoryId: { notIn: ["cat-1", "cat-2"] } },
          ],
        }),
      }),
    );
  });
});

