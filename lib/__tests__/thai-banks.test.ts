import {
  getBankDisplayName,
  getBankLogoUrl,
  getBankColor,
  getContrastTextColor,
  getBankIconColor,
  THAI_BANKS,
  BANK_OTHER,
} from "../thai-banks";

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

  describe("getBankLogoUrl", () => {
    it("returns URL for known bank", () => {
      const url = getBankLogoUrl("bangkok");
      expect(url).toContain("BBL.png");
    });

    it("returns null for unknown bank", () => {
      expect(getBankLogoUrl("nonexistent")).toBeNull();
    });
  });

  describe("getBankColor", () => {
    it("returns hex color for known bank", () => {
      expect(getBankColor("kasikorn")).toBe("#1DA858");
    });

    it("returns null for unknown bank", () => {
      expect(getBankColor("nonexistent")).toBeNull();
    });
  });

  describe("getContrastTextColor", () => {
    it("returns white for dark colors", () => {
      expect(getContrastTextColor("#000000")).toBe("white");
      expect(getContrastTextColor("#29449D")).toBe("white");
    });

    it("returns black for light colors", () => {
      expect(getContrastTextColor("#FFFFFF")).toBe("black");
      expect(getContrastTextColor("#FFD51C")).toBe("black");
    });
  });

  describe("getBankIconColor", () => {
    it("returns a Tailwind bg class", () => {
      const color = getBankIconColor(0);
      expect(color).toMatch(/^bg-/);
    });

    it("wraps around for large indices", () => {
      const c1 = getBankIconColor(0);
      const c2 = getBankIconColor(20);
      expect(c1).toBe(c2);
    });
  });
});
