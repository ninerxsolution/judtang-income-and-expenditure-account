const mockResendSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockResendSend(...args) },
  })),
}));

const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendReportNotificationEmail,
  sendContactNotificationEmail,
} from "../email";

const originalEnv = process.env;

function useResendEnv(): void {
  process.env = {
    ...originalEnv,
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "Judtang <noreply@judtang.com>",
  };
  delete process.env.EMAIL_REPORT_FROM;
  delete process.env.EMAIL_REPLY_TO;
}

function useSmtpEnv(): void {
  process.env = {
    ...originalEnv,
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "user@example.com",
    SMTP_PASSWORD: "secret",
  };
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_REPORT_FROM;
  delete process.env.EMAIL_REPLY_TO;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockResendSend.mockResolvedValue({
    data: { id: "resend-msg-id" },
    error: null,
    headers: null,
  });
  mockSendMail.mockResolvedValue({ messageId: "smtp-msg-id" });
});

afterAll(() => {
  process.env = originalEnv;
});

describe("sendPasswordResetEmail (Resend)", () => {
  beforeEach(() => {
    useResendEnv();
  });

  it("sends email with reset URL", async () => {
    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=abc",
      "en"
    );
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const payload = mockResendSend.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      from: string;
    };
    expect(payload.to).toBe("user@example.com");
    expect(payload.subject).toContain("Reset");
    expect(payload.html).toContain("https://example.com/reset?token=abc");
    expect(payload.from).toBe("Judtang <noreply@judtang.com>");
  });

  it("includes replyTo when EMAIL_REPLY_TO is set", async () => {
    process.env.EMAIL_REPLY_TO = "support@judtang.com";
    await sendPasswordResetEmail("user@example.com", "https://example.com/r", "en");
    const payload = mockResendSend.mock.calls[0][0] as { replyTo?: string };
    expect(payload.replyTo).toBe("support@judtang.com");
  });

  it("throws when RESEND_API_KEY is set but EMAIL_FROM is missing", async () => {
    delete process.env.EMAIL_FROM;
    await expect(
      sendPasswordResetEmail("u@example.com", "https://x.com/r", "en")
    ).rejects.toThrow(/EMAIL_FROM/);
  });
});

describe("sendEmailVerification (Resend)", () => {
  beforeEach(() => {
    useResendEnv();
  });

  it("sends email with verify URL", async () => {
    await sendEmailVerification(
      "user@example.com",
      "https://example.com/verify?token=xyz",
      "en"
    );
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const payload = mockResendSend.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(payload.to).toBe("user@example.com");
    expect(payload.subject).toContain("Verify");
    expect(payload.html).toContain("https://example.com/verify?token=xyz");
  });
});

describe("sendReportNotificationEmail (Resend)", () => {
  beforeEach(() => {
    useResendEnv();
    process.env.EMAIL_REPORT_FROM = "Judtang Report <report@judtang.com>";
  });

  it("sends report notification with report from address", async () => {
    await sendReportNotificationEmail(
      "admin@example.com",
      {
        id: "r-1",
        category: "BUG",
        title: "Login issue",
        userEmail: "user@example.com",
        description: "Cannot login",
      },
      "https://admin.example.com/reports/r-1",
      "en"
    );
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const payload = mockResendSend.mock.calls[0][0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
    };
    expect(payload.to).toBe("admin@example.com");
    expect(payload.subject).toContain("BUG");
    expect(payload.html).toContain("Login issue");
    expect(payload.from).toBe("Judtang Report <report@judtang.com>");
  });

  it("falls back to EMAIL_FROM when EMAIL_REPORT_FROM is unset", async () => {
    delete process.env.EMAIL_REPORT_FROM;
    await sendReportNotificationEmail(
      "admin@example.com",
      {
        id: "r-2",
        category: "FEATURE",
        title: "Long",
        userEmail: "user@example.com",
        description: "x",
      },
      "https://admin.example.com/reports/r-2",
      "en"
    );
    const payload = mockResendSend.mock.calls[0][0] as { from: string };
    expect(payload.from).toBe("Judtang <noreply@judtang.com>");
  });

  it("truncates long descriptions", async () => {
    const longDesc = "A".repeat(600);
    await sendReportNotificationEmail(
      "admin@example.com",
      {
        id: "r-2",
        category: "FEATURE",
        title: "Long",
        userEmail: "user@example.com",
        description: longDesc,
      },
      "https://admin.example.com/reports/r-2",
      "en"
    );
    const payload = mockResendSend.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("...");
  });

  it("escapes HTML in description", async () => {
    await sendReportNotificationEmail(
      "admin@example.com",
      {
        id: "r-3",
        category: "BUG",
        title: "XSS",
        userEmail: "user@example.com",
        description: '<script>alert("xss")</script>',
      },
      "https://admin.example.com/reports/r-3",
      "en"
    );
    const payload = mockResendSend.mock.calls[0][0] as { html: string };
    expect(payload.html).not.toContain("<script>");
    expect(payload.html).toContain("&lt;script&gt;");
  });
});

describe("sendContactNotificationEmail (Resend)", () => {
  beforeEach(() => {
    useResendEnv();
  });

  it("sends with Reply-To set to submitter", async () => {
    await sendContactNotificationEmail(
      "team@example.com",
      {
        id: "cm-1",
        topic: "GENERAL",
        senderName: "Ada",
        senderEmail: "ada@example.com",
        subject: "Hello there",
        message: "Body text here for the team.",
        uiLanguage: "th",
        submittedAtIso: "2026-03-29T12:00:00.000Z",
      },
      "https://app.test/admin/contact-messages/cm-1",
      "ada@example.com"
    );
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const payload = mockResendSend.mock.calls[0][0] as {
      to: string;
      replyTo?: string;
      subject: string;
      html: string;
    };
    expect(payload.to).toBe("team@example.com");
    expect(payload.replyTo).toBe("ada@example.com");
    expect(payload.subject).toContain("Hello there");
    expect(payload.html).toContain("ada@example.com");
    expect(payload.html).toContain("Body text here");
  });
});

describe("Resend API error", () => {
  beforeEach(() => {
    useResendEnv();
    mockResendSend.mockResolvedValue({
      data: null,
      error: {
        message: "Invalid",
        statusCode: 422,
        name: "validation_error",
      },
      headers: null,
    });
  });

  it("throws when Resend returns error", async () => {
    await expect(
      sendEmailVerification("u@example.com", "https://x.com/v", "en")
    ).rejects.toThrow("Invalid");
  });
});

describe("SMTP fallback", () => {
  beforeEach(() => {
    useSmtpEnv();
  });

  it("sendPasswordResetEmail uses nodemailer when no Resend key", async () => {
    await sendPasswordResetEmail(
      "user@example.com",
      "https://example.com/reset?token=abc",
      "en"
    );
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0] as {
      to: string;
      from: string;
    };
    expect(call.to).toBe("user@example.com");
    expect(call.from).toBe("user@example.com");
  });

  it("uses EMAIL_FROM for SMTP when set without Resend", async () => {
    process.env.EMAIL_FROM = "App <noreply@app.com>";
    await sendPasswordResetEmail("u@example.com", "https://x/r", "en");
    const call = mockSendMail.mock.calls[0][0] as { from: string };
    expect(call.from).toBe("App <noreply@app.com>");
  });
});
