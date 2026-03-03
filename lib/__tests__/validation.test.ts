import {
  normalizeEmail,
  isValidEmailFormat,
  validatePasswordLength,
  EMAIL_MAX_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "../validation";

describe("validation", () => {
  describe("normalizeEmail", () => {
    it("trims whitespace and lowercases", () => {
      expect(normalizeEmail("  Test@Example.COM  ")).toBe("test@example.com");
    });
    it("returns empty string for empty input", () => {
      expect(normalizeEmail("")).toBe("");
      expect(normalizeEmail("   ")).toBe("");
    });
    it("handles already normalized email", () => {
      expect(normalizeEmail("user@domain.com")).toBe("user@domain.com");
    });
  });

  describe("isValidEmailFormat", () => {
    it("returns true for valid emails", () => {
      expect(isValidEmailFormat("a@b.co")).toBe(true);
      expect(isValidEmailFormat("user@domain.com")).toBe(true);
      expect(isValidEmailFormat("user.name+tag@sub.domain.co")).toBe(true);
    });
    it("returns false for invalid emails", () => {
      expect(isValidEmailFormat("")).toBe(false);
      expect(isValidEmailFormat("no-at-sign")).toBe(false);
      expect(isValidEmailFormat("@nodomain.com")).toBe(false);
      expect(isValidEmailFormat("user@")).toBe(false);
      expect(isValidEmailFormat("user@.com")).toBe(false);
      expect(isValidEmailFormat("user@domain")).toBe(false);
    });
  });

  describe("validatePasswordLength", () => {
    it("returns ok for password at min length", () => {
      const pwd = "a".repeat(MIN_PASSWORD_LENGTH);
      expect(validatePasswordLength(pwd)).toEqual({ ok: true });
    });
    it("returns ok for password at max length", () => {
      const pwd = "a".repeat(MAX_PASSWORD_LENGTH);
      expect(validatePasswordLength(pwd)).toEqual({ ok: true });
    });
    it("returns error when too short", () => {
      const result = validatePasswordLength("short");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("at least");
      expect(result.error).toContain(String(MIN_PASSWORD_LENGTH));
    });
    it("returns error when too long", () => {
      const result = validatePasswordLength("a".repeat(MAX_PASSWORD_LENGTH + 1));
      expect(result.ok).toBe(false);
      expect(result.error).toContain("at most");
      expect(result.error).toContain(String(MAX_PASSWORD_LENGTH));
    });
  });
});
