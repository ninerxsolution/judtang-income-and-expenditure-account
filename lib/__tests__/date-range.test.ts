import { getDateRangeInTimezone, toDateStringInTimezone, parseOccurredAt } from "../date-range";

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
    it("converts UTC date to Bangkok timezone correctly", () => {
      const d = new Date("2025-03-15T20:00:00Z");
      const result = toDateStringInTimezone(d, "Asia/Bangkok");
      expect(result).toBe("2025-03-16");
    });
  });

  describe("parseOccurredAt", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-06-15T10:30:45.123Z"));
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns current time when value is undefined", () => {
      const result = parseOccurredAt(undefined);
      expect(result.toISOString()).toBe("2025-06-15T10:30:45.123Z");
    });

    it("returns current time when value is empty string", () => {
      const result = parseOccurredAt("");
      expect(result.toISOString()).toBe("2025-06-15T10:30:45.123Z");
    });

    it("returns current time when value is whitespace only", () => {
      const result = parseOccurredAt("   ");
      expect(result.toISOString()).toBe("2025-06-15T10:30:45.123Z");
    });

    it("merges current UTC time into date-only value (YYYY-MM-DD)", () => {
      const result = parseOccurredAt("2025-03-06");
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(6);
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(30);
      expect(result.getUTCSeconds()).toBe(45);
      expect(result.getUTCMilliseconds()).toBe(123);
    });

    it("trims whitespace around date-only value", () => {
      const result = parseOccurredAt("  2025-03-06  ");
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(6);
      expect(result.getUTCHours()).toBe(10);
    });

    it("returns fallback for invalid date-only value", () => {
      const result = parseOccurredAt("9999-99-99");
      expect(result.toISOString()).toBe("2025-06-15T10:30:45.123Z");
    });

    it("parses full ISO datetime string as-is", () => {
      const result = parseOccurredAt("2025-03-06T15:34:00.000Z");
      expect(result.toISOString()).toBe("2025-03-06T15:34:00.000Z");
    });

    it("parses ISO datetime with timezone offset", () => {
      const result = parseOccurredAt("2025-03-06T15:34:00+07:00");
      expect(result.getUTCHours()).toBe(8);
      expect(result.getUTCMinutes()).toBe(34);
    });

    it("returns current time for completely invalid string", () => {
      const result = parseOccurredAt("not-a-date");
      expect(result.toISOString()).toBe("2025-06-15T10:30:45.123Z");
    });

    it("returns current time for partial datetime string that fails to parse", () => {
      const result = parseOccurredAt("2025-13-45T99:99:99Z");
      expect(result.toISOString()).toBe("2025-06-15T10:30:45.123Z");
    });
  });
});
