import { shouldSkipTurnstileVerification } from "../turnstile";

describe("shouldSkipTurnstileVerification", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("returns true when CLOUDFLARE_TURNSTILE_SECRETKEY is not set", () => {
    delete process.env.CLOUDFLARE_TURNSTILE_SECRETKEY;
    expect(shouldSkipTurnstileVerification()).toBe(true);
  });

  it("returns true when APP_ENV is development", () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRETKEY = "secret";
    process.env.APP_ENV = "development";
    expect(shouldSkipTurnstileVerification()).toBe(true);
  });

  it("returns true when NEXTAUTH_URL contains localhost", () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRETKEY = "secret";
    process.env.APP_ENV = "production";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(shouldSkipTurnstileVerification()).toBe(true);
  });

  it("returns true when NEXTAUTH_URL contains 127.0.0.1", () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRETKEY = "secret";
    process.env.APP_ENV = "production";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";
    expect(shouldSkipTurnstileVerification()).toBe(true);
  });

  it("returns true when request host is localhost", () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRETKEY = "secret";
    process.env.APP_ENV = "production";
    process.env.NEXTAUTH_URL = "https://example.com";
    const req = new Request("https://example.com", {
      headers: { host: "localhost:3000" },
    });
    expect(shouldSkipTurnstileVerification(req)).toBe(true);
  });

  it("returns false when all conditions are production", () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRETKEY = "secret";
    process.env.APP_ENV = "production";
    process.env.NEXTAUTH_URL = "https://example.com";
    const req = new Request("https://example.com", {
      headers: { host: "example.com" },
    });
    expect(shouldSkipTurnstileVerification(req)).toBe(false);
  });

  it("returns false without request when URL is production", () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRETKEY = "secret";
    process.env.APP_ENV = "production";
    process.env.NEXTAUTH_URL = "https://example.com";
    expect(shouldSkipTurnstileVerification()).toBe(false);
  });
});
