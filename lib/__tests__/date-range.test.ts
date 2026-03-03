import { getDateRangeInTimezone, toDateStringInTimezone } from "../date-range";

describe("date-range", () => {
  describe("getDateRangeInTimezone", () => {
    it("returns null for invalid date format", () => {
      expect(getDateRangeInTimezone("")).toBe(null);
      expect(getDateRangeInTimezone("2025-01")).toBe(null);
      expect(getDateRangeInTimezone("01-01-2025")).toBe(null);
      expect(getDateRangeInTimezone("invalid")).toBe(null);
    });
    it("returns null for invalid date values", () => {
      expect(getDateRangeInTimezone("2025-00-01")).toBe(null);
      expect(getDateRangeInTimezone("2025-13-01")).toBe(null);
      expect(getDateRangeInTimezone("2025-01-00")).toBe(null);
      expect(getDateRangeInTimezone("2025-01-32")).toBe(null);
    });
    it("returns from and to for valid YYYY-MM-DD", () => {
      const result = getDateRangeInTimezone("2025-01-15");
      expect(result).not.toBeNull();
      expect(result!.from).toBeInstanceOf(Date);
      expect(result!.to).toBeInstanceOf(Date);
      expect(result!.from.getTime()).toBeLessThan(result!.to.getTime());
    });
    it("trims whitespace", () => {
      const result = getDateRangeInTimezone("  2025-01-15  ");
      expect(result).not.toBeNull();
    });
    it("accepts custom timezone", () => {
      const result = getDateRangeInTimezone("2025-01-15", "UTC");
      expect(result).not.toBeNull();
    });
  });

  describe("toDateStringInTimezone", () => {
    it("returns YYYY-MM-DD format", () => {
      const d = new Date("2025-03-15T12:00:00Z");
      const result = toDateStringInTimezone(d, "UTC");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it("returns consistent format for same date in UTC", () => {
      const d = new Date(Date.UTC(2025, 2, 15, 12, 0, 0));
      const result = toDateStringInTimezone(d, "UTC");
      expect(result).toBe("2025-03-15");
    });
  });
});
