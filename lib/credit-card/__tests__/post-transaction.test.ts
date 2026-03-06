const mockTxFindUnique = jest.fn();
const mockTxUpdate = jest.fn();
const mockRecomputeOutstanding = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: (...args: unknown[]) => mockTxFindUnique(...args),
      update: (...args: unknown[]) => mockTxUpdate(...args),
    },
  },
}));

jest.mock("@prisma/client", () => ({
  TransactionStatus: { PENDING: "PENDING", POSTED: "POSTED" },
}));

jest.mock("../outstanding", () => ({
  recomputeOutstanding: (...args: unknown[]) => mockRecomputeOutstanding(...args),
}));

import { postTransaction } from "../post-transaction";

beforeEach(() => jest.clearAllMocks());

describe("postTransaction", () => {
  it("throws when transaction not found", async () => {
    mockTxFindUnique.mockResolvedValue(null);
    await expect(postTransaction("tx-1")).rejects.toThrow("Transaction not found or already posted");
  });

  it("throws when transaction is already posted", async () => {
    mockTxFindUnique.mockResolvedValue({ id: "tx-1", status: "POSTED", financialAccount: null });
    await expect(postTransaction("tx-1")).rejects.toThrow("Transaction not found or already posted");
  });

  it("posts a pending transaction", async () => {
    mockTxFindUnique.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      postedDate: null,
      financialAccountId: "acc-1",
      financialAccount: { type: "BANK" },
    });
    mockTxUpdate.mockResolvedValue({});

    await postTransaction("tx-1");
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-1" },
        data: expect.objectContaining({ status: "POSTED" }),
      }),
    );
  });

  it("uses existing postedDate when available", async () => {
    const postedDate = new Date("2025-06-01");
    mockTxFindUnique.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      postedDate,
      financialAccountId: "acc-1",
      financialAccount: { type: "BANK" },
    });
    mockTxUpdate.mockResolvedValue({});

    await postTransaction("tx-1");
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postedDate }),
      }),
    );
  });

  it("recomputes outstanding for credit card accounts", async () => {
    mockTxFindUnique.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      postedDate: null,
      financialAccountId: "cc-1",
      financialAccount: { type: "CREDIT_CARD" },
    });
    mockTxUpdate.mockResolvedValue({});
    mockRecomputeOutstanding.mockResolvedValue(undefined);

    await postTransaction("tx-1");
    expect(mockRecomputeOutstanding).toHaveBeenCalledWith("cc-1");
  });

  it("does not recompute outstanding for non-credit-card accounts", async () => {
    mockTxFindUnique.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      postedDate: null,
      financialAccountId: "bank-1",
      financialAccount: { type: "BANK" },
    });
    mockTxUpdate.mockResolvedValue({});

    await postTransaction("tx-1");
    expect(mockRecomputeOutstanding).not.toHaveBeenCalled();
  });
});
