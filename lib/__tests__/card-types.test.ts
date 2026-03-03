import {
  getCardTypeDisplayName,
  CARD_TYPES,
  CARD_TYPE_OTHER,
} from "../card-types";

describe("card-types", () => {
  describe("getCardTypeDisplayName", () => {
    it("returns null for null/undefined/empty", () => {
      expect(getCardTypeDisplayName(null)).toBeNull();
      expect(getCardTypeDisplayName(undefined)).toBeNull();
      expect(getCardTypeDisplayName("")).toBeNull();
    });
    it("returns null for CARD_TYPE_OTHER", () => {
      expect(getCardTypeDisplayName(CARD_TYPE_OTHER)).toBeNull();
    });
    it("returns Thai name by default", () => {
      expect(getCardTypeDisplayName("credit")).toBe("บัตรเครดิต");
      expect(getCardTypeDisplayName("debit")).toBe("บัตรเดบิต");
    });
    it("returns English name when locale is en", () => {
      expect(getCardTypeDisplayName("credit", "en")).toBe("Credit");
      expect(getCardTypeDisplayName("visa", "en")).toBe("Visa");
    });
    it("returns cardTypeId when not found in list", () => {
      expect(getCardTypeDisplayName("unknown-type")).toBe("unknown-type");
    });
  });

  describe("CARD_TYPES", () => {
    it("contains expected types", () => {
      expect(CARD_TYPES.length).toBeGreaterThan(0);
      expect(CARD_TYPES.some((c) => c.id === "credit")).toBe(true);
      expect(CARD_TYPES.some((c) => c.id === "debit")).toBe(true);
    });
  });
});
