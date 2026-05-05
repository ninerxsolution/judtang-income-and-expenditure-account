import {
  isExplicitCategoryIdChange,
  isExplicitCategoryLabelChange,
} from "@/lib/transfer-group-patch-utils";

describe("transfer-group-patch-utils", () => {
  describe("isExplicitCategoryIdChange", () => {
    it("returns false when categoryId is omitted (undefined)", () => {
      expect(isExplicitCategoryIdChange(undefined, "c1")).toBe(false);
    });

    it("returns false when explicit null matches existing null", () => {
      expect(isExplicitCategoryIdChange(null, null)).toBe(false);
    });

    it("returns true when explicit null replaces existing id", () => {
      expect(isExplicitCategoryIdChange(null, "c1")).toBe(true);
    });

    it("returns true when explicit id replaces null", () => {
      expect(isExplicitCategoryIdChange("c1", null)).toBe(true);
    });

    it("returns false when explicit id equals existing", () => {
      expect(isExplicitCategoryIdChange("c1", "c1")).toBe(false);
    });

    it("returns false when trimmed id equals existing", () => {
      expect(isExplicitCategoryIdChange("  c1  ", "c1")).toBe(false);
    });
  });

  describe("isExplicitCategoryLabelChange", () => {
    it("returns false when category label omitted", () => {
      expect(isExplicitCategoryLabelChange(undefined, "Food")).toBe(false);
    });

    it("returns false when explicit null matches existing null", () => {
      expect(isExplicitCategoryLabelChange(null, null)).toBe(false);
    });

    it("returns true when label changes", () => {
      expect(isExplicitCategoryLabelChange("A", "B")).toBe(true);
    });
  });
});
