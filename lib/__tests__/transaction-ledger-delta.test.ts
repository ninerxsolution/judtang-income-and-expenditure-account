import { ledgerNetChangeForAccount } from "@/lib/transaction-ledger-delta";

describe("ledgerNetChangeForAccount", () => {
  it("INCOME on account adds amount", () => {
    expect(
      ledgerNetChangeForAccount(
        {
          type: "INCOME",
          amount: 100,
          financialAccountId: "A",
          transferAccountId: null,
          transferLeg: null,
        },
        "A",
      ),
    ).toBe(100);
  });

  it("EXPENSE on account subtracts amount", () => {
    expect(
      ledgerNetChangeForAccount(
        {
          type: "EXPENSE",
          amount: 50,
          financialAccountId: "A",
          transferAccountId: null,
          transferLeg: null,
        },
        "A",
      ),
    ).toBe(-50);
  });

  it("legacy TRANSFER: source loses, destination gains", () => {
    const row = {
      type: "TRANSFER",
      amount: 200,
      financialAccountId: "A",
      transferAccountId: "B",
      transferLeg: null as string | null,
    };
    expect(ledgerNetChangeForAccount(row, "A")).toBe(-200);
    expect(ledgerNetChangeForAccount(row, "B")).toBe(200);
  });

  it("paired OUT/IN legs", () => {
    const out = {
      type: "TRANSFER",
      amount: 10,
      financialAccountId: "A",
      transferAccountId: "B",
      transferLeg: "OUT" as string | null,
    };
    const inn = {
      type: "TRANSFER",
      amount: 9,
      financialAccountId: "B",
      transferAccountId: "A",
      transferLeg: "IN" as string | null,
    };
    expect(ledgerNetChangeForAccount(out, "A")).toBe(-10);
    expect(ledgerNetChangeForAccount(inn, "B")).toBe(9);
  });
});
