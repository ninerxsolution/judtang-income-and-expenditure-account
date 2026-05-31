import {
  prepareBulkTransactionRows,
  collectReferencedAccountIds,
  collectReferencedCategoryIds,
  type BulkAccountInfo,
  type BulkTransactionInput,
  type PrepareBulkContext,
} from "@/lib/bulk-transactions";

const THB_A = "acc_thb_a";
const THB_B = "acc_thb_b";
const USD_A = "acc_usd_a";

function makeCtx(overrides?: Partial<PrepareBulkContext>): PrepareBulkContext {
  const accountsById = new Map<string, BulkAccountInfo>([
    [THB_A, { id: THB_A, currency: "THB" }],
    [THB_B, { id: THB_B, currency: "THB" }],
    [USD_A, { id: USD_A, currency: "USD" }],
  ]);
  const categoryNamesById = new Map<string, string>([
    ["cat_food", "อาหาร"],
    ["cat_salary", "เงินเดือน"],
  ]);
  return {
    defaultAccountId: THB_A,
    accountsById,
    categoryNamesById,
    ...overrides,
  };
}

function row(overrides: Partial<BulkTransactionInput>): BulkTransactionInput {
  return {
    type: "EXPENSE",
    amount: 100,
    occurredAt: "2026-05-10T08:30:00.000Z",
    ...overrides,
  };
}

describe("prepareBulkTransactionRows", () => {
  it("accepts a valid THB expense and resolves currency, baseAmount, and category name", () => {
    const { errors, rows } = prepareBulkTransactionRows(
      [row({ amount: 250, financialAccountId: THB_A, categoryId: "cat_food" })],
      makeCtx(),
    );
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "EXPENSE",
      amount: 250,
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 250,
      financialAccountId: THB_A,
      transferAccountId: null,
      categoryId: "cat_food",
      category: "อาหาร",
    });
    expect(rows[0].occurredAt).toBeInstanceOf(Date);
    expect(rows[0].postedDate.getTime()).toBe(rows[0].occurredAt.getTime());
  });

  it("falls back to the default account when financialAccountId is omitted", () => {
    const { errors, rows } = prepareBulkTransactionRows(
      [row({ financialAccountId: undefined })],
      makeCtx(),
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].financialAccountId).toBe(THB_A);
  });

  it("converts a USD account leg to THB with the default fallback rate", () => {
    const { errors, rows } = prepareBulkTransactionRows(
      [row({ amount: 10, financialAccountId: USD_A })],
      makeCtx(),
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].currency).toBe("USD");
    expect(rows[0].exchangeRate).toBe(32);
    expect(rows[0].baseAmount).toBe(320);
  });

  it("rejects a non-positive amount", () => {
    const { errors, rows } = prepareBulkTransactionRows(
      [row({ amount: 0 }), row({ amount: -5 })],
      makeCtx(),
    );
    expect(rows).toHaveLength(0);
    expect(errors.map((e) => e.code)).toEqual(["amount", "amount"]);
    expect(errors[0].index).toBe(0);
    expect(errors[1].index).toBe(1);
  });

  it("rejects an invalid type", () => {
    const { errors } = prepareBulkTransactionRows(
      [row({ type: "PAYMENT" })],
      makeCtx(),
    );
    expect(errors).toEqual([
      { index: 0, code: "type", message: expect.any(String) },
    ]);
  });

  it("rejects a missing occurredAt", () => {
    const { errors } = prepareBulkTransactionRows(
      [row({ occurredAt: "" })],
      makeCtx(),
    );
    expect(errors[0].code).toBe("occurredAt");
  });

  it("rejects an unknown financial account (e.g. belongs to another user)", () => {
    const { errors } = prepareBulkTransactionRows(
      [row({ financialAccountId: "acc_someone_else" })],
      makeCtx(),
    );
    expect(errors[0].code).toBe("financialAccountId");
  });

  it("drops an unknown/foreign categoryId instead of erroring (prevents FK 500)", () => {
    const { errors, rows } = prepareBulkTransactionRows(
      [row({ categoryId: "cat_not_mine" })],
      makeCtx(),
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].categoryId).toBeNull();
    expect(rows[0].category).toBeNull();
  });

  describe("TRANSFER", () => {
    it("requires a destination account", () => {
      const { errors } = prepareBulkTransactionRows(
        [row({ type: "TRANSFER", financialAccountId: THB_A })],
        makeCtx(),
      );
      expect(errors[0].code).toBe("transferAccountId");
    });

    it("rejects same source and destination", () => {
      const { errors } = prepareBulkTransactionRows(
        [
          row({
            type: "TRANSFER",
            financialAccountId: THB_A,
            transferAccountId: THB_A,
          }),
        ],
        makeCtx(),
      );
      expect(errors[0].code).toBe("transferAccountId");
    });

    it("accepts a same-currency transfer between two accounts", () => {
      const { errors, rows } = prepareBulkTransactionRows(
        [
          row({
            type: "TRANSFER",
            amount: 500,
            financialAccountId: THB_A,
            transferAccountId: THB_B,
          }),
        ],
        makeCtx(),
      );
      expect(errors).toHaveLength(0);
      expect(rows[0]).toMatchObject({
        type: "TRANSFER",
        financialAccountId: THB_A,
        transferAccountId: THB_B,
      });
    });

    it("rejects a cross-currency transfer (THB -> USD)", () => {
      const { errors } = prepareBulkTransactionRows(
        [
          row({
            type: "TRANSFER",
            financialAccountId: THB_A,
            transferAccountId: USD_A,
          }),
        ],
        makeCtx(),
      );
      expect(errors[0].code).toBe("crossCurrency");
    });
  });

  it("reports per-row indices and only skips the invalid rows", () => {
    const { errors, rows, accountIds } = prepareBulkTransactionRows(
      [
        row({ amount: 100, financialAccountId: THB_A }), // ok (0)
        row({ amount: 0 }), // bad (1)
        row({
          type: "TRANSFER",
          amount: 50,
          financialAccountId: THB_A,
          transferAccountId: THB_B,
        }), // ok (2)
      ],
      makeCtx(),
    );
    // Because the batch is rejected on any error, the route uses `errors`; but
    // the function still returns the rows it could build for inspection.
    expect(errors).toEqual([{ index: 1, code: "amount", message: expect.any(String) }]);
    expect(rows).toHaveLength(2);
    expect(accountIds.sort()).toEqual([THB_A, THB_B].sort());
  });
});

describe("collectReferencedAccountIds", () => {
  it("includes the default account and dedupes source + destination ids", () => {
    const ids = collectReferencedAccountIds(
      [
        row({ financialAccountId: THB_A }),
        row({ type: "TRANSFER", financialAccountId: THB_A, transferAccountId: THB_B }),
        row({ financialAccountId: undefined }),
      ],
      "acc_default",
    );
    expect(ids.sort()).toEqual(["acc_default", THB_A, THB_B].sort());
  });
});

describe("collectReferencedCategoryIds", () => {
  it("collects distinct, non-empty category ids", () => {
    const ids = collectReferencedCategoryIds([
      row({ categoryId: "cat_food" }),
      row({ categoryId: "cat_food" }),
      row({ categoryId: "" }),
      row({ categoryId: "cat_salary" }),
    ]);
    expect(ids.sort()).toEqual(["cat_food", "cat_salary"]);
  });
});
