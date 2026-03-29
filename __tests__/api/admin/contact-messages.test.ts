/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    contactMessage: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { GET as GETList } from "@/app/api/admin/contact-messages/route";
import { GET as GETOne } from "@/app/api/admin/contact-messages/[id]/route";
import { createParams } from "../../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/admin/contact-messages", () => {
  it("returns 403 when not admin", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const res = await GETList(new Request("http://localhost/api/admin/contact-messages"));
    expect(res.status).toBe(403);
  });

  it("returns paginated list for admin", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mockFindMany.mockResolvedValue([
      {
        id: "m1",
        topic: "GENERAL",
        subject: "Subj",
        senderEmail: "x@y.com",
        senderName: null,
        emailSentAt: new Date(),
        createdAt: new Date("2026-03-29T10:00:00Z"),
      },
    ]);
    mockCount.mockResolvedValue(1);

    const res = await GETList(
      new Request("http://localhost/api/admin/contact-messages?page=1&limit=20")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].id).toBe("m1");
  });
});

describe("GET /api/admin/contact-messages/[id]", () => {
  it("returns 404 when not found", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue(null);
    const res = await GETOne(
      new Request("http://localhost/api/admin/contact-messages/missing"),
      { params: createParams({ id: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns detail for admin", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({
      id: "m1",
      topic: "GENERAL",
      subject: "Hi",
      message: "Long message here ok",
      senderEmail: "a@b.com",
      senderName: "Ann",
      uiLanguage: "en",
      ipAddress: "127.0.0.1",
      browserInfo: "jest",
      emailSentAt: null,
      createdAt: new Date("2026-03-29T10:00:00Z"),
    });
    const res = await GETOne(
      new Request("http://localhost/api/admin/contact-messages/m1"),
      { params: createParams({ id: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("m1");
    expect(data.message).toContain("Long message");
  });
});
