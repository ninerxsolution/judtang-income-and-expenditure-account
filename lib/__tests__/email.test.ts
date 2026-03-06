const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail: mockSendMail }),
}));

import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendReportNotificationEmail,
} from "../email";

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue({ messageId: "test-id" });
});

describe("sendPasswordResetEmail", () => {
  it("sends email with reset URL", async () => {
    await sendPasswordResetEmail("user@example.com", "https://example.com/reset?token=abc");
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toContain("Reset");
    expect(call.html).toContain("https://example.com/reset?token=abc");
  });
});

describe("sendEmailVerification", () => {
  it("sends email with verify URL", async () => {
    await sendEmailVerification("user@example.com", "https://example.com/verify?token=xyz");
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toContain("Verify");
    expect(call.html).toContain("https://example.com/verify?token=xyz");
  });
});

describe("sendReportNotificationEmail", () => {
  it("sends report notification", async () => {
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
    );
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("admin@example.com");
    expect(call.subject).toContain("BUG");
    expect(call.html).toContain("Login issue");
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
    );
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("...");
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
    );
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });
});
