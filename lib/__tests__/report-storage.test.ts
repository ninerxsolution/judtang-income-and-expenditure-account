import {
  getAllowedTypes,
  isAllowedType,
  getMaxFileSize,
  getMaxFiles,
  getImageAbsolutePath,
} from "../report-storage";
import path from "path";

describe("report-storage", () => {
  describe("getAllowedTypes", () => {
    it("returns array of allowed MIME types", () => {
      const types = getAllowedTypes();
      expect(types).toContain("image/jpeg");
      expect(types).toContain("image/png");
      expect(types).toContain("image/webp");
    });
  });

  describe("isAllowedType", () => {
    it("returns true for allowed types", () => {
      expect(isAllowedType("image/jpeg")).toBe(true);
      expect(isAllowedType("image/png")).toBe(true);
      expect(isAllowedType("image/webp")).toBe(true);
    });

    it("returns false for disallowed types", () => {
      expect(isAllowedType("image/gif")).toBe(false);
      expect(isAllowedType("text/plain")).toBe(false);
      expect(isAllowedType("application/pdf")).toBe(false);
    });
  });

  describe("getMaxFileSize", () => {
    it("returns 2MB", () => {
      expect(getMaxFileSize()).toBe(2 * 1024 * 1024);
    });
  });

  describe("getMaxFiles", () => {
    it("returns 3", () => {
      expect(getMaxFiles()).toBe(3);
    });
  });

  describe("getImageAbsolutePath", () => {
    it("returns absolute path for relative path", () => {
      const result = getImageAbsolutePath("report/image/test.jpg");
      expect(result).toBe(path.join(process.cwd(), "storage", "report", "image", "test.jpg"));
    });

    it("strips prefix correctly", () => {
      const result = getImageAbsolutePath("report/image/abc_uuid.png");
      expect(result).toContain("abc_uuid.png");
    });
  });
});
