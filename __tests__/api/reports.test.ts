/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockReportCreate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockReportUpdate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    report: {
      create: (...args: unknown[]) => mockReportCreate(...args),
      update: (...args: unknown[]) => mockReportUpdate(...args),
    },
  },
}));

jest.mock("@/lib/turnstile", () => ({
  shouldSkipTurnstileVerification: () => true,
  verifyTurnstileToken: () => ({ success: true }),
}));

jest.mock("@/lib/report-rate-limit", () => ({
  checkReportRateLimit: () => ({ allowed: true }),
  incrementReportRateLimit: jest.fn(),
}));

jest.mock("@/lib/report-storage", () => ({
  saveReportImage: jest.fn().mockResolvedValue("path/to/image.jpg"),
  isAllowedType: () => true,
  getMaxFileSize: () => 2 * 1024 * 1024,
  getMaxFiles: () => 3,
}));

jest.mock("@/lib/email", () => ({
  sendReportNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/reports/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(null);
  mockReportCreate.mockResolvedValue({ id: "report-1" });
  mockUserFindUnique.mockResolvedValue({ email: "user@example.com" });
  mockReportUpdate.mockResolvedValue({});
});

describe("POST /api/reports", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("category", "BUG");
    formData.set("title", "Test bug report");
    formData.set("description", "This is a test description with enough length.");
    const req = new Request("http://localhost/api/reports", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when category is invalid", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const formData = new FormData();
    formData.set("category", "INVALID");
    formData.set("title", "Test report");
    formData.set("description", "This is a test description with enough length.");
    const req = new Request("http://localhost/api/reports", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("category");
  });

  it("returns 400 when title is too short", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const formData = new FormData();
    formData.set("category", "BUG");
    formData.set("title", "Ab");
    formData.set("description", "This is a test description with enough length.");
    const req = new Request("http://localhost/api/reports", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Title");
  });

  it("returns 201 and creates report on success", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockReportCreate.mockResolvedValue({ id: "report-1" });
    const formData = new FormData();
    formData.set("category", "FEATURE_REQUEST");
    formData.set("title", "Test feature request");
    formData.set("description", "This is a test description with enough length for validation.");
    const req = new Request("http://localhost/api/reports", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe("report-1");
    expect(data.message).toContain("submitted");
    expect(mockReportCreate).toHaveBeenCalled();
  });
});
