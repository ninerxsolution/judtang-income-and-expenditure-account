import {
  getCurrencyInputSymbol,
  resolveCrossCurrencyTransferLegs,
  roundMoney2,
} from "@/lib/currency";

describe("getCurrencyInputSymbol", () => {
  it("maps THB and USD", () => {
    expect(getCurrencyInputSymbol("THB")).toBe("฿");
    expect(getCurrencyInputSymbol("usd")).toBe("$");
  });

  it("falls back to ISO code for other 3-letter codes", () => {
    expect(getCurrencyInputSymbol("EUR")).toBe("EUR");
  });
});

describe("resolveCrossCurrencyTransferLegs", () => {
  it("THB→USD: balances bases from both amounts (no bank rate)", () => {
    const r = resolveCrossCurrencyTransferLegs({
      fromCurrency: "THB",
      toCurrency: "USD",
      fromAmount: 16332.05,
      toAmount: 500,
    });
    expect(r.fromAmount).toBe(16332.05);
    expect(r.toAmount).toBe(500);
    expect(r.baseOut + r.baseIn).toBe(0);
    expect(r.baseOut).toBe(-16332.05);
    expect(r.baseIn).toBe(16332.05);
    expect(r.thbPerUnitSource).toBe(1);
    expect(r.thbPerUnitDestination).toBeCloseTo(16332.05 / 500, 5);
  });

  it("THB→USD: bank rate derives THB debit from USD received", () => {
    const r = resolveCrossCurrencyTransferLegs({
      fromCurrency: "THB",
      toCurrency: "USD",
      fromAmount: 99999,
      toAmount: 500,
      bankRateThbPerForeignUnit: 32.5,
    });
    expect(r.toAmount).toBe(500);
    expect(r.fromAmount).toBe(roundMoney2(500 * 32.5));
    expect(r.baseOut + r.baseIn).toBe(0);
    expect(r.thbPerUnitSource).toBe(1);
  });

  it("USD→THB: balances from both amounts", () => {
    const r = resolveCrossCurrencyTransferLegs({
      fromCurrency: "USD",
      toCurrency: "THB",
      fromAmount: 1000,
      toAmount: 32664.1,
    });
    expect(r.baseOut + r.baseIn).toBe(0);
    expect(r.thbPerUnitDestination).toBe(1);
  });

  it("USD→THB: bank rate derives THB credit", () => {
    const r = resolveCrossCurrencyTransferLegs({
      fromCurrency: "USD",
      toCurrency: "THB",
      fromAmount: 100,
      toAmount: 1,
      bankRateThbPerForeignUnit: 33,
    });
    expect(r.fromAmount).toBe(100);
    expect(r.toAmount).toBe(3300);
    expect(r.baseIn).toBe(3300);
    expect(r.baseOut).toBe(-3300);
  });

  it("rejects absurd implied THB/USD when deriving from amounts", () => {
    expect(() =>
      resolveCrossCurrencyTransferLegs({
        fromCurrency: "THB",
        toCurrency: "USD",
        fromAmount: 500,
        toAmount: 500,
      }),
    ).toThrow(/unrealistic/i);
  });
});
