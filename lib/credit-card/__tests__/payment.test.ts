import { recordPayment } from "../payment";

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockTransactionCreate = jest.fn();
const mockStatementUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    creditCardStatement: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockStatementUpdate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

jest.mock("../outstanding", () => ({
  getCurrentOutstanding: jest.fn(),
  recomputeOutstanding: jest.fn(),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
}));

import { getCurrentOutstanding, recomputeOutstanding } from "../outstanding";

const mockGetCurrentOutstanding = getCurrentOutstanding as jest.MockedFunction<
  typeof getCurrentOutstanding
>;
const mockRecomputeOutstanding = recomputeOutstanding as jest.MockedFunction<
  typeof recomputeOutstanding
>;

const validCreditCard = {
  type: "CREDIT_CARD",
  userId: "user-1",
  name: "บัตรกสิกร",
  bankName: "bangkok",
  accountNumber: "1234567890123456",
  creditLimit: 50000,
  interestRate: 15,
  cardType: "credit",
};

const validFromAccount = {
  userId: "user-1",
  type: "BANK",
  bankName: "kasikorn",
  accountNumber: "1234567890",
};

const baseParams = {
  userId: "user-1",
  accountId: "cc-1",
  amount: 1000,
  occurredAt: new Date("2026-03-01"),
};

function createTxClient() {
  return {
    transaction: {
      create: mockTransactionCreate,
    },
    creditCardStatement: {
      update: mockStatementUpdate,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentOutstanding.mockResolvedValue(5000);
  mockRecomputeOutstanding.mockResolvedValue(undefined);
  mockTransactionCreate.mockResolvedValue({
    id: "tx-1",
    type: "PAYMENT",
    amount: 1000,
    financialAccountId: "cc-1",
    occurredAt: baseParams.occurredAt,
  });
  mockTransaction.mockImplementation(async (fn) => {
    const tx = createTxClient();
    return fn(tx);
  });
});

describe("recordPayment", () => {
  describe("validation", () => {
    it("throws when amount is not a positive number", async () => {
      mockFindUnique.mockResolvedValue(validCreditCard);

      await expect(
        recordPayment({ ...baseParams, amount: 0 })
      ).rejects.toThrow("Amount must be a positive number");

      await expect(
        recordPayment({ ...baseParams, amount: -100 })
      ).rejects.toThrow("Amount must be a positive number");

      await expect(
        recordPayment({ ...baseParams, amount: NaN })
      ).rejects.toThrow("Amount must be a positive number");
    });

    it("throws when account is not a credit card", async () => {
      mockFindUnique.mockResolvedValue({
        ...validCreditCard,
        type: "BANK",
      });

      await expect(recordPayment(baseParams)).rejects.toThrow(
        "Account is not a credit card"
      );
    });

    it("throws when account not found (null)", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(recordPayment(baseParams)).rejects.toThrow(
        "Account is not a credit card"
      );
    });

    it("throws when account belongs to different user", async () => {
      mockFindUnique.mockResolvedValue({
        ...validCreditCard,
        userId: "other-user",
      });

      await expect(recordPayment(baseParams)).rejects.toThrow("Account not found");
    });

    it("throws when credit card is incomplete", async () => {
      mockFindUnique.mockResolvedValue({
        ...validCreditCard,
        bankName: null,
      });

      await expect(recordPayment(baseParams)).rejects.toThrow(
        "Credit card account is incomplete"
      );
    });

    it("throws when payment exceeds outstanding", async () => {
      mockFindUnique.mockResolvedValue(validCreditCard);
      mockGetCurrentOutstanding.mockResolvedValue(500);

      await expect(recordPayment(baseParams)).rejects.toThrow(
        "Payment cannot exceed outstanding balance"
      );
    });

    it("throws when from-account not found", async () => {
      mockFindUnique
        .mockResolvedValueOnce(validCreditCard)
        .mockResolvedValueOnce(null);

      await expect(
        recordPayment({ ...baseParams, fromAccountId: "from-1" })
      ).rejects.toThrow("From account not found");
    });

    it("throws when from-account belongs to different user", async () => {
      mockFindUnique
        .mockResolvedValueOnce(validCreditCard)
        .mockResolvedValueOnce({ ...validFromAccount, userId: "other" });

      await expect(
        recordPayment({ ...baseParams, fromAccountId: "from-1" })
      ).rejects.toThrow("From account not found");
    });

    it("throws when from-account is CREDIT_CARD", async () => {
      mockFindUnique
        .mockResolvedValueOnce(validCreditCard)
        .mockResolvedValueOnce({ ...validFromAccount, type: "CREDIT_CARD" });

      await expect(
        recordPayment({ ...baseParams, fromAccountId: "from-1" })
      ).rejects.toThrow("Cannot pay credit card from another credit card");
    });

    it("throws when from-account is incomplete", async () => {
      mockFindUnique
        .mockResolvedValueOnce(validCreditCard)
        .mockResolvedValueOnce({ ...validFromAccount, bankName: null });

      await expect(
        recordPayment({ ...baseParams, fromAccountId: "from-1" })
      ).rejects.toThrow("From account is incomplete");
    });
  });

  describe("successful payment", () => {
    it("creates PAYMENT transaction and returns it", async () => {
      mockFindUnique.mockResolvedValue(validCreditCard);
      mockFindMany.mockResolvedValue([]);

      const result = await recordPayment(baseParams);

      expect(result).toEqual({
        id: "tx-1",
        type: "PAYMENT",
        amount: 1000,
        financialAccountId: "cc-1",
        occurredAt: baseParams.occurredAt,
      });
      expect(mockTransactionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "PAYMENT",
            amount: 1000,
            financialAccountId: "cc-1",
          }),
        })
      );
      expect(mockRecomputeOutstanding).toHaveBeenCalledWith("cc-1");
    });

    it("creates EXPENSE on from-account when fromAccountId provided", async () => {
      mockFindUnique
        .mockResolvedValueOnce(validCreditCard)
        .mockResolvedValueOnce(validFromAccount);
      mockFindMany.mockResolvedValue([]);
      mockTransactionCreate
        .mockResolvedValueOnce({
          id: "tx-payment",
          type: "PAYMENT",
          amount: 1000,
          financialAccountId: "cc-1",
          occurredAt: baseParams.occurredAt,
        })
        .mockResolvedValueOnce({
          id: "tx-expense",
          type: "EXPENSE",
          amount: 1000,
          financialAccountId: "from-1",
        });

      await recordPayment({ ...baseParams, fromAccountId: "from-1" });

      expect(mockTransactionCreate).toHaveBeenCalledTimes(2);
      expect(mockTransactionCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            type: "EXPENSE",
            amount: 1000,
            financialAccountId: "from-1",
            note: "ชำระบัตร: บัตรกสิกร",
          }),
        })
      );
    });

    it("allocates to unpaid statements", async () => {
      mockFindUnique.mockResolvedValue(validCreditCard);
      mockFindMany.mockResolvedValue([
        {
          id: "stmt-1",
          statementBalance: 3000,
          paidAmount: 0,
        },
      ]);

      await recordPayment(baseParams);

      expect(mockStatementUpdate).toHaveBeenCalledWith({
        where: { id: "stmt-1" },
        data: expect.objectContaining({
          paidAmount: 1000,
          isPaid: false,
        }),
      });
    });
  });
});
