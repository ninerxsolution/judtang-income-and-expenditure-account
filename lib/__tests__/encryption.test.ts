import { randomBytes } from "crypto";

const VALID_KEY = randomBytes(32).toString("base64");

beforeEach(() => {
  process.env.ENCRYPTION_KEY = VALID_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
  jest.resetModules();
});

function loadModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../encryption") as typeof import("../encryption");
}

describe("encryption", () => {
  describe("encrypt / decrypt round-trip", () => {
    it("encrypts and decrypts a simple string", () => {
      const { encrypt, decrypt } = loadModule();
      const plaintext = "Hello, World!";
      const ciphertext = encrypt(plaintext);
      expect(ciphertext).not.toBe(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("encrypts and decrypts an empty string", () => {
      const { encrypt, decrypt } = loadModule();
      const ciphertext = encrypt("");
      expect(decrypt(ciphertext)).toBe("");
    });

    it("encrypts and decrypts unicode text", () => {
      const { encrypt, decrypt } = loadModule();
      const plaintext = "สวัสดีครับ 🎉 日本語";
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("produces different ciphertext for the same plaintext (random IV)", () => {
      const { encrypt } = loadModule();
      const ct1 = encrypt("test");
      const ct2 = encrypt("test");
      expect(ct1).not.toBe(ct2);
    });

    it("encrypts and decrypts a long string", () => {
      const { encrypt, decrypt } = loadModule();
      const plaintext = "A".repeat(10000);
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });
  });

  describe("decrypt error cases", () => {
    it("throws on tampered ciphertext", () => {
      const { encrypt, decrypt } = loadModule();
      const ciphertext = encrypt("test");
      const buf = Buffer.from(ciphertext, "base64");
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString("base64");
      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws on too-short ciphertext", () => {
      const { decrypt } = loadModule();
      const short = Buffer.alloc(10).toString("base64");
      expect(() => decrypt(short)).toThrow("Invalid ciphertext");
    });
  });

  describe("getKey errors", () => {
    it("throws when ENCRYPTION_KEY is not set", () => {
      delete process.env.ENCRYPTION_KEY;
      jest.resetModules();
      const { encrypt } = loadModule();
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY is not set");
    });

    it("throws when ENCRYPTION_KEY has wrong length", () => {
      process.env.ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
      jest.resetModules();
      const { encrypt } = loadModule();
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be 32 bytes");
    });
  });

  describe("isEncrypted", () => {
    it("returns true for encrypted output", () => {
      const { encrypt, isEncrypted } = loadModule();
      const ciphertext = encrypt("This is a reasonably long plaintext for testing");
      expect(isEncrypted(ciphertext)).toBe(true);
    });

    it("returns false for short strings", () => {
      const { isEncrypted } = loadModule();
      expect(isEncrypted("abc")).toBe(false);
      expect(isEncrypted("")).toBe(false);
    });

    it("returns false for plaintext that looks long but is not base64", () => {
      const { isEncrypted } = loadModule();
      expect(isEncrypted("this is a very long plaintext string that is not base64 encoded!!@@##$$")).toBe(false);
    });

    it("returns false for null-like inputs", () => {
      const { isEncrypted } = loadModule();
      expect(isEncrypted("")).toBe(false);
    });
  });
});
