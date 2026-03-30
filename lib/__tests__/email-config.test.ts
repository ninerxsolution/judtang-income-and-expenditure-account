import {
  buildAdminContactMessageDetailUrl,
  buildAdminReportDetailUrl,
  buildResetPasswordUrl,
  buildVerifyEmailUrl,
  getEmailAppBaseUrl,
} from "../email-config";

const originalEnv = process.env;

afterAll(() => {
  process.env = originalEnv;
});

describe("getEmailAppBaseUrl", () => {
  it("prefers APP_BASE_URL over NEXTAUTH_URL when not in development mode", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      APP_ENV: "production",
      APP_BASE_URL: "https://prod.example/",
      NEXTAUTH_URL: "http://localhost:3910",
    };
    expect(getEmailAppBaseUrl()).toBe("https://prod.example");
  });

  it("prefers NEXTAUTH_URL when APP_ENV is development even if APP_BASE_URL is set", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      APP_ENV: "development",
      APP_BASE_URL: "https://prod.example",
      NEXTAUTH_URL: "http://localhost:3910",
    };
    expect(getEmailAppBaseUrl()).toBe("http://localhost:3910");
  });

  it("prefers NEXTAUTH_URL when NODE_ENV is development", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      APP_BASE_URL: "https://prod.example",
      NEXTAUTH_URL: "http://127.0.0.1:3910",
    };
    expect(getEmailAppBaseUrl()).toBe("http://127.0.0.1:3910");
  });

  it("uses NEXTAUTH_URL when APP_BASE_URL is unset", () => {
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3910";
    expect(getEmailAppBaseUrl()).toBe("http://localhost:3910");
  });

  it("defaults to localhost:3910", () => {
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;
    expect(getEmailAppBaseUrl()).toBe("http://localhost:3910");
  });
});

describe("buildVerifyEmailUrl", () => {
  it("builds URL with default path", () => {
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "https://app.test";
    delete process.env.EMAIL_VERIFY_URL;
    expect(buildVerifyEmailUrl("tok+1")).toBe(
      "https://app.test/verify-email?token=tok%2B1"
    );
  });

  it("respects EMAIL_VERIFY_URL", () => {
    process.env = {
      ...originalEnv,
      NEXTAUTH_URL: "https://app.test",
      EMAIL_VERIFY_URL: "auth/confirm-email",
    };
    expect(buildVerifyEmailUrl("abc")).toBe(
      "https://app.test/auth/confirm-email?token=abc"
    );
  });

  it("appends lang when provided", () => {
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = "https://app.test";
    delete process.env.EMAIL_VERIFY_URL;
    expect(buildVerifyEmailUrl("tok", "en")).toBe(
      "https://app.test/verify-email?token=tok&lang=en"
    );
  });
});

describe("buildResetPasswordUrl", () => {
  it("respects EMAIL_RESET_PASSWORD_URL", () => {
    process.env = {
      ...originalEnv,
      APP_BASE_URL: "https://x.com",
      EMAIL_RESET_PASSWORD_URL: "/new-password",
    };
    expect(buildResetPasswordUrl("t")).toBe(
      "https://x.com/new-password?token=t"
    );
  });

  it("appends lang when provided", () => {
    process.env = {
      ...originalEnv,
      APP_BASE_URL: "https://x.com",
      EMAIL_RESET_PASSWORD_URL: "/new-password",
    };
    expect(buildResetPasswordUrl("t", "th")).toBe(
      "https://x.com/new-password?token=t&lang=th"
    );
  });
});

describe("buildAdminReportDetailUrl", () => {
  it("encodes report id in path", () => {
    process.env = { ...originalEnv, APP_BASE_URL: "https://x.com" };
    expect(buildAdminReportDetailUrl("r-1")).toBe(
      "https://x.com/admin/reports/r-1"
    );
  });
});

describe("buildAdminContactMessageDetailUrl", () => {
  it("encodes message id in path", () => {
    process.env = { ...originalEnv, APP_BASE_URL: "https://x.com" };
    expect(buildAdminContactMessageDetailUrl("abc123")).toBe(
      "https://x.com/admin/contact-messages/abc123"
    );
  });
});
