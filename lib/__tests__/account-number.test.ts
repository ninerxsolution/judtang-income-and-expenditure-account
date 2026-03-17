const mockDecrypt = jest.fn();
const mockEncrypt = jest.fn();
const mockIsEncrypted = jest.fn();

jest.mock("@/lib/encryption", () => ({
  decrypt: (...args: unknown[]) => mockDecrypt(...args),
  encrypt: (...args: unknown[]) => mockEncrypt(...args),
  isEncrypted: (...args: unknown[]) => mockIsEncrypted(...args),
}));

import {
  getAccountNumberForMasking,
  processAccountNumberForStorage,
  getFullAccountNumber,
} from "../account-number";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("account-number", () => {
  describe("getAccountNumberForMasking", () => {
    it("returns empty for null/undefined/empty", () => {
      expect(getAccountNumberForMasking(null, "FULL")).toBe("");
      expect(getAccountNumberForMasking(undefined, "FULL")).toBe("");
      expect(getAccountNumberForMasking("", "FULL")).toBe("");
    });
    it("returns empty when fewer than 4 digits", () => {
      expect(getAccountNumberForMasking("123", "LAST_4_ONLY")).toBe("");
    });
    it("returns last 4 for LAST_4_ONLY mode", () => {
      expect(getAccountNumberForMasking("1234567890", "LAST_4_ONLY")).toBe("7890");
    });
    it("returns all 4 when exactly 4 digits", () => {
      expect(getAccountNumberForMasking("1234", "LAST_4_ONLY")).toBe("1234");
    });
    it("decrypts and returns full for FULL mode when encrypted", () => {
      mockIsEncrypted.mockReturnValue(true);
      mockDecrypt.mockReturnValue("1234567890");

      expect(getAccountNumberForMasking("encrypted1234", "FULL")).toBe("1234567890");
      expect(mockDecrypt).toHaveBeenCalledWith("encrypted1234");
    });
    it("returns last 4 for FULL mode when not encrypted", () => {
      mockIsEncrypted.mockReturnValue(false);

      expect(getAccountNumberForMasking("1234567890", "FULL")).toBe("7890");
      expect(mockDecrypt).not.toHaveBeenCalled();
    });
    it("returns last 4 when decrypt throws", () => {
      mockIsEncrypted.mockReturnValue(true);
      mockDecrypt.mockImplementation(() => {
        throw new Error("decrypt failed");
      });

      expect(getAccountNumberForMasking("bad1234", "FULL")).toBe("1234");
    });
  });

  describe("processAccountNumberForStorage", () => {
    it("returns null for empty/empty digits", () => {
      expect(processAccountNumberForStorage("", null, "BANK")).toEqual({
        accountNumber: null,
        accountNumberMode: null,
      });
      expect(processAccountNumberForStorage("   ", null, "BANK")).toEqual({
        accountNumber: null,
        accountNumberMode: null,
      });
    });
    it("for CREDIT_CARD: stores last 4 only", () => {
      expect(processAccountNumberForStorage("1234567890", null, "CREDIT_CARD")).toEqual({
        accountNumber: "7890",
        accountNumberMode: null,
      });
    });
    it("for CREDIT_CARD: returns null when fewer than 4 digits", () => {
      expect(processAccountNumberForStorage("123", null, "CREDIT_CARD")).toEqual({
        accountNumber: null,
        accountNumberMode: null,
      });
    });
    it("for BANK LAST_4_ONLY: stores last 4", () => {
      expect(processAccountNumberForStorage("1234567890", "LAST_4_ONLY", "BANK")).toEqual({
        accountNumber: "7890",
        accountNumberMode: "LAST_4_ONLY",
      });
    });
    it("for BANK FULL: encrypts when encrypt succeeds", () => {
      mockEncrypt.mockReturnValue("encrypted-1234567890");

      expect(processAccountNumberForStorage("1234567890", "FULL", "BANK")).toEqual({
        accountNumber: "encrypted-1234567890",
        accountNumberMode: "FULL",
      });
      expect(mockEncrypt).toHaveBeenCalledWith("1234567890");
    });
    it("for BANK FULL: throws when encrypt fails (no silent fallback)", () => {
      mockEncrypt.mockImplementation(() => {
        throw new Error("ENCRYPTION_KEY is not set");
      });

      expect(() =>
        processAccountNumberForStorage("1234567890", "FULL", "BANK")
      ).toThrow("ENCRYPTION_KEY");
    });
    it("for WALLET: same behavior as BANK", () => {
      expect(processAccountNumberForStorage("1234567890", "LAST_4_ONLY", "WALLET")).toEqual({
        accountNumber: "7890",
        accountNumberMode: "LAST_4_ONLY",
      });
    });
    it("returns null for invalid type", () => {
      expect(processAccountNumberForStorage("1234567890", null, "OTHER")).toEqual({
        accountNumber: null,
        accountNumberMode: null,
      });
    });
  });

  describe("getFullAccountNumber", () => {
    it("returns null for null/undefined/empty", () => {
      expect(getFullAccountNumber(null, "FULL")).toBeNull();
      expect(getFullAccountNumber(undefined, "FULL")).toBeNull();
    });
    it("returns null when mode is not FULL", () => {
      expect(getFullAccountNumber("encrypted", "LAST_4_ONLY")).toBeNull();
    });
    it("returns null when not encrypted", () => {
      mockIsEncrypted.mockReturnValue(false);
      expect(getFullAccountNumber("1234567890", "FULL")).toBeNull();
    });
    it("returns decrypted value when FULL and encrypted", () => {
      mockIsEncrypted.mockReturnValue(true);
      mockDecrypt.mockReturnValue("1234567890");

      expect(getFullAccountNumber("encrypted-value", "FULL")).toBe("1234567890");
    });
    it("returns null when decrypt throws", () => {
      mockIsEncrypted.mockReturnValue(true);
      mockDecrypt.mockImplementation(() => {
        throw new Error("decrypt failed");
      });

      expect(getFullAccountNumber("bad-encrypted", "FULL")).toBeNull();
    });
  });
});
