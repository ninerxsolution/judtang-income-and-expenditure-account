import {
  getCategoryDisplayName,
  DEFAULT_CATEGORY_TRANSLATIONS,
} from "../categories-display";

describe("categories-display", () => {
  describe("getCategoryDisplayName", () => {
    it("returns empty string for empty name", () => {
      expect(getCategoryDisplayName("", "th")).toBe("");
      expect(getCategoryDisplayName("", "en")).toBe("");
    });
    it("returns Thai name as-is for locale th", () => {
      expect(getCategoryDisplayName("เงินเดือน", "th")).toBe("เงินเดือน");
      expect(getCategoryDisplayName("อาหาร", "th")).toBe("อาหาร");
    });
    it("translates default categories for locale en", () => {
      expect(getCategoryDisplayName("เงินเดือน", "en")).toBe("Salary");
      expect(getCategoryDisplayName("อาหาร", "en")).toBe("Food");
    });
    it("returns custom category name as-is for en when not in defaults", () => {
      expect(getCategoryDisplayName("Custom Category", "en")).toBe("Custom Category");
    });
  });

  describe("DEFAULT_CATEGORY_TRANSLATIONS", () => {
    it("contains expected mappings", () => {
      expect(DEFAULT_CATEGORY_TRANSLATIONS["เงินเดือน"]).toBe("Salary");
      expect(DEFAULT_CATEGORY_TRANSLATIONS["อาหาร"]).toBe("Food");
    });
  });
});
