/**
 * @jest-environment node
 */
const mockContactCreate = jest.fn();
const mockContactUpdate = jest.fn();
const mockSendContact = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    contactMessage: {
      create: (...args: unknown[]) => mockContactCreate(...args),
      update: (...args: unknown[]) => mockContactUpdate(...args),
    },
  },
}));

jest.mock("@/lib/turnstile", () => ({
  shouldSkipTurnstileVerification: () => true,
  verifyTurnstileToken: () => ({ success: true }),
}));

jest.mock("@/lib/contact-rate-limit", () => ({
  checkContactRateLimit: () => ({ allowed: true }),
  incrementContactRateLimit: jest.fn(),
}));

jest.mock("@/lib/email", () => ({
  sendContactNotificationEmail: (...args: unknown[]) => mockSendContact(...args),
}));

import { POST } from "@/app/api/contact/route";
import { createRequest } from "../helpers/api-helper";

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, PUBLIC_CONTACT_TO: "info@example.com" };
  mockContactCreate.mockResolvedValue({
    id: "cm-1",
    topic: "GENERAL",
    senderName: null,
    senderEmail: "user@example.com",
    subject: "Hello world",
    message: "This is a long enough message body.",
    uiLanguage: "th",
    createdAt: new Date("2026-03-29T12:00:00Z"),
  });
  mockContactUpdate.mockResolvedValue({});
  mockSendContact.mockResolvedValue(undefined);
});

afterAll(() => {
  process.env = originalEnv;
});

describe("POST /api/contact", () => {
  it("returns 400 when topic invalid", async () => {
    const req = createRequest("http://localhost/api/contact", {
      method: "POST",
      body: {
        email: "user@example.com",
        topic: "NOT_A_TOPIC",
        subject: "Hello world",
        message: "This is a long enough message body.",
      },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("topic");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when subject too short", async () => {
    const req = createRequest("http://localhost/api/contact", {
      method: "POST",
      body: {
        email: "user@example.com",
        topic: "GENERAL",
        subject: "Hi",
        message: "This is a long enough message body.",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("creates message and sends email when PUBLIC_CONTACT_TO set", async () => {
    const req = createRequest("http://localhost/api/contact", {
      method: "POST",
      body: {
        email: "user@example.com",
        topic: "GENERAL",
        subject: "Hello world",
        message: "This is a long enough message body.",
        language: "en",
      },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockContactCreate).toHaveBeenCalled();
    expect(mockSendContact).toHaveBeenCalled();
    expect(mockContactUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cm-1" },
        data: expect.objectContaining({ emailSentAt: expect.any(Date) }),
      })
    );
  });

  it("skips email when PUBLIC_CONTACT_TO unset", async () => {
    delete process.env.PUBLIC_CONTACT_TO;
    const req = createRequest("http://localhost/api/contact", {
      method: "POST",
      body: {
        email: "user@example.com",
        topic: "OTHER",
        subject: "Hello world",
        message: "This is a long enough message body.",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendContact).not.toHaveBeenCalled();
    expect(mockContactUpdate).not.toHaveBeenCalled();
  });
});
