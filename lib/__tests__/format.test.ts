import {
  maskAccountNumber,
  formatCardNumber,
  formatBankAccountNumber,
  formatAmount,
} from "../format";

describe("format", () => {
  describe("maskAccountNumber", () => {
    it("returns empty for null/undefined/empty", () => {
      expect(maskAccountNumber(null)).toBe("");
      expect(maskAccountNumber(undefined)).toBe("");
      expect(maskAccountNumber("")).toBe("");
    });
    it("returns empty when fewer than 4 digits", () => {
      expect(maskAccountNumber("123")).toBe("");
      expect(maskAccountNumber("12")).toBe("");
    });
    it("masks to last 4 digits", () => {
      expect(maskAccountNumber("1234567890")).toBe("****7890");
      expect(maskAccountNumber("123-4-56789-0")).toBe("****7890");
    });
    it("strips non-digits before masking", () => {
      expect(maskAccountNumber("1234 5678 9012 3456")).toBe("****3456");
    });
  });

  describe("formatCardNumber", () => {
    it("returns empty for null/undefined/empty", () => {
      expect(formatCardNumber(null)).toBe("");
      expect(formatCardNumber(undefined)).toBe("");
      expect(formatCardNumber("")).toBe("");
    });
    it("formats 16 digits with spaces every 4", () => {
      expect(formatCardNumber("1234567890123456")).toBe("1234 5678 9012 3456");
    });
    it("strips non-digits", () => {
      expect(formatCardNumber("1234-5678-9012-3456")).toBe("1234 5678 9012 3456");
    });
    it("handles shorter strings", () => {
      expect(formatCardNumber("1234")).toBe("1234");
    });
  });

  describe("formatBankAccountNumber", () => {
    it("returns empty for null/undefined/empty", () => {
      expect(formatBankAccountNumber(null)).toBe("");
      expect(formatBankAccountNumber(undefined)).toBe("");
      expect(formatBankAccountNumber("")).toBe("");
    });
    it("formats Thai 3-1-5-1 for 10 digits", () => {
      expect(formatBankAccountNumber("1234567890")).toBe("123-4-56789-0");
    });
    it("handles 3 digits", () => {
      expect(formatBankAccountNumber("123")).toBe("123");
    });
    it("handles 4 digits", () => {
      expect(formatBankAccountNumber("1234")).toBe("123-4");
    });
    it("handles 5-9 digits", () => {
      expect(formatBankAccountNumber("12345")).toBe("123-4-5");
      expect(formatBankAccountNumber("123456789")).toBe("123-4-56789");
    });
    it("handles more than 10 digits", () => {
      expect(formatBankAccountNumber("12345678901")).toBe("123-4-56789-0-1");
    });
    it("strips non-digits", () => {
      expect(formatBankAccountNumber("123-4-56789-0")).toBe("123-4-56789-0");
    });
  });

  describe("formatAmount", () => {
    it("formats number with thousand separators", () => {
      expect(formatAmount(1000)).toBe("1,000.00");
      expect(formatAmount(1000000)).toBe("1,000,000.00");
      expect(formatAmount(123.45)).toBe("123.45");
    });
    it("returns '-' for non-finite", () => {
      expect(formatAmount(NaN)).toBe("-");
      expect(formatAmount(Infinity)).toBe("-");
    });
    it("handles Prisma Decimal-like object with toNumber", () => {
      expect(formatAmount({ toNumber: () => 50000 })).toBe("50,000.00");
    });
    it("handles string input", () => {
      expect(formatAmount("1234.56")).toBe("1,234.56");
    });
    it("handles zero", () => {
      expect(formatAmount(0)).toBe("0.00");
    });
    it("handles negative", () => {
      expect(formatAmount(-1000)).toBe("-1,000.00");
    });
  });
});
