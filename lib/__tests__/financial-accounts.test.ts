jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import { isAccountIncomplete } from "../financial-accounts";

describe("isAccountIncomplete", () => {
  describe("CASH and OTHER", () => {
    it("returns false for CASH with no bank or number", () => {
      expect(isAccountIncomplete({ type: "CASH" })).toBe(false);
    });
    it("returns false for OTHER with no bank or number", () => {
      expect(isAccountIncomplete({ type: "OTHER" })).toBe(false);
    });
  });

  describe("BANK and WALLET", () => {
    it("returns true when bankName is missing", () => {
      expect(
        isAccountIncomplete({
          type: "BANK",
          bankName: null,
          accountNumber: "1234567890",
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "WALLET",
          bankName: "",
          accountNumber: "1234567890",
        })
      ).toBe(true);
    });
    it("returns true when accountNumber is missing", () => {
      expect(
        isAccountIncomplete({
          type: "BANK",
          bankName: "bangkok",
          accountNumber: null,
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "WALLET",
          bankName: "bangkok",
          accountNumber: "",
        })
      ).toBe(true);
    });
    it("returns true when accountNumber has fewer than 4 digits", () => {
      expect(
        isAccountIncomplete({
          type: "BANK",
          bankName: "bangkok",
          accountNumber: "123",
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "BANK",
          bankName: "bangkok",
          accountNumber: "12",
        })
      ).toBe(true);
    });
    it("returns false when bank and accountNumber (>= 4 digits) are present", () => {
      expect(
        isAccountIncomplete({
          type: "BANK",
          bankName: "bangkok",
          accountNumber: "1234",
        })
      ).toBe(false);
      expect(
        isAccountIncomplete({
          type: "BANK",
          bankName: "bangkok",
          accountNumber: "123-4-56789-0",
        })
      ).toBe(false);
      expect(
        isAccountIncomplete({
          type: "WALLET",
          bankName: "other",
          accountNumber: "1234567890",
        })
      ).toBe(false);
    });
  });

  describe("CREDIT_CARD", () => {
    it("returns true when bankName or accountNumber is missing", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: null,
          accountNumber: "1234567890123456",
          creditLimit: 50000,
          interestRate: 15,
          cardAccountType: "credit",
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "123",
          creditLimit: 50000,
          interestRate: 15,
          cardAccountType: "credit",
        })
      ).toBe(true);
    });
    it("returns true when creditLimit is missing or invalid", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: null,
          interestRate: 15,
          cardAccountType: "credit",
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: undefined,
          interestRate: 15,
          cardAccountType: "credit",
        })
      ).toBe(true);
    });
    it("returns true when interestRate is missing or invalid", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: 50000,
          interestRate: null,
          cardAccountType: "credit",
        })
      ).toBe(true);
    });
    it("returns true when cardAccountType is missing or empty", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: 50000,
          interestRate: 15,
          cardAccountType: null,
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: 50000,
          interestRate: 15,
          cardAccountType: "   ",
        })
      ).toBe(true);
    });
    it("returns false when all required fields are present (credit)", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: 50000,
          interestRate: 15,
          cardAccountType: "credit",
        })
      ).toBe(false);
    });
    it("returns true when debit card has no linkedAccountId", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234",
          cardAccountType: "debit",
          linkedAccountId: null,
        })
      ).toBe(true);
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234",
          cardAccountType: "debit",
          linkedAccountId: "",
        })
      ).toBe(true);
    });
    it("returns false when debit card has linkedAccountId", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234",
          cardAccountType: "debit",
          linkedAccountId: "acc-123",
        })
      ).toBe(false);
    });
    it("handles Prisma Decimal-like objects (toNumber)", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: { toNumber: () => 50000 },
          interestRate: { toNumber: () => 15 },
          cardAccountType: "credit",
        })
      ).toBe(false);
    });
    it("handles Prisma Decimal-like objects (toString)", () => {
      expect(
        isAccountIncomplete({
          type: "CREDIT_CARD",
          bankName: "bangkok",
          accountNumber: "1234567890123456",
          creditLimit: { toString: () => "50000" } as { toNumber?: () => number },
          interestRate: { toString: () => "15" } as { toNumber?: () => number },
          cardAccountType: "credit",
        })
      ).toBe(false);
    });
  });
});
