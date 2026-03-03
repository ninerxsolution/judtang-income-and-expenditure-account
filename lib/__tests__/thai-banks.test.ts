import { getBankDisplayName, THAI_BANKS, BANK_OTHER } from "../thai-banks";

describe("thai-banks", () => {
  describe("getBankDisplayName", () => {
    it("returns null for null/undefined/empty", () => {
      expect(getBankDisplayName(null)).toBeNull();
      expect(getBankDisplayName(undefined)).toBeNull();
      expect(getBankDisplayName("")).toBeNull();
    });
    it("returns null for BANK_OTHER", () => {
      expect(getBankDisplayName(BANK_OTHER)).toBeNull();
    });
    it("returns Thai name by default", () => {
      expect(getBankDisplayName("bangkok")).toBe("ธนาคารกรุงเทพ");
      expect(getBankDisplayName("kasikorn")).toBe("ธนาคารกสิกรไทย");
    });
    it("returns English name when locale is en", () => {
      expect(getBankDisplayName("bangkok", "en")).toBe("Bangkok Bank");
      expect(getBankDisplayName("kasikorn", "en")).toBe("Kasikorn Bank");
    });
    it("returns bankId when not found in list", () => {
      expect(getBankDisplayName("unknown-bank")).toBe("unknown-bank");
    });
  });

  describe("THAI_BANKS", () => {
    it("contains expected banks", () => {
      expect(THAI_BANKS.length).toBeGreaterThan(0);
      expect(THAI_BANKS.some((b) => b.id === "bangkok")).toBe(true);
      expect(THAI_BANKS.some((b) => b.id === "kasikorn")).toBe(true);
    });
  });
});
