import { Prisma } from "@prisma/client";
import {
  accumulateCalendarDaySummary,
  calendarTransactionAmountThb,
  emptyDaySummaryAccumulator,
} from "../calendar-summary-thb";

describe("calendarTransactionAmountThb", () => {
  it("uses baseAmount when stored", () => {
    const thb = calendarTransactionAmountThb({
      type: "EXPENSE",
      transferLeg: null,
      amount: 100,
      currency: "USD",
      exchangeRate: 35,
      baseAmount: 3200,
    });
    expect(thb).toBe(3200);
  });

  it("computes from amount and exchange rate when baseAmount is null", () => {
    const thb = calendarTransactionAmountThb({
      type: "EXPENSE",
      transferLeg: null,
      amount: new Prisma.Decimal("10"),
      currency: "USD",
      exchangeRate: 32,
      baseAmount: null,
    });
    expect(thb).toBe(320);
  });
});

describe("accumulateCalendarDaySummary", () => {
  it("sums income, expense, and transfer-out in THB", () => {
    let acc = emptyDaySummaryAccumulator();
    acc = accumulateCalendarDaySummary(acc, {
      type: "INCOME",
      transferLeg: null,
      amount: 1000,
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 1000,
    });
    acc = accumulateCalendarDaySummary(acc, {
      type: "EXPENSE",
      transferLeg: null,
      amount: 200,
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 200,
    });
    acc = accumulateCalendarDaySummary(acc, {
      type: "TRANSFER",
      transferLeg: "OUT",
      amount: 500,
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 500,
    });
    acc = accumulateCalendarDaySummary(acc, {
      type: "TRANSFER",
      transferLeg: "IN",
      amount: 500,
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 500,
    });

    expect(acc.incomeSumThb).toBe(1000);
    expect(acc.expenseSumThb).toBe(200);
    expect(acc.transferSumThb).toBe(500);
    expect(acc.transferCount).toBe(1);
    expect(acc.count).toBe(4);
  });
});
