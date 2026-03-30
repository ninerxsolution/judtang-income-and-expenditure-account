/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockFinalizeDeletion = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

const mockUserFindFirst = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/user-status", () => ({
  finalizeDeletion: (...args: unknown[]) => mockFinalizeDeletion(...args),
}));

import { PATCH } from "@/app/api/admin/users/[id]/route";

function jsonRequest(body: object): Request {
  return new Request("http://localhost/api/admin/users/u1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: "admin-1", role: "ADMIN" },
  });
  mockFinalizeDeletion.mockResolvedValue(undefined);
  mockUserFindFirst.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue({
    id: "u1",
    email: "deleted_u1_old@example.com",
    name: "X",
    role: "USER",
    status: "DELETED",
  });
  mockUserUpdate.mockResolvedValue({
    id: "u1",
    email: "old@example.com",
    name: "X",
    role: "USER",
    status: "ACTIVE",
  });
});

describe("PATCH /api/admin/users/[id] status DELETED", () => {
  it("calls finalizeDeletion instead of only setting status", async () => {
    const req = jsonRequest({ status: "DELETED" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    const data = (await res.json()) as { user?: { id: string } };

    expect(res.status).toBe(200);
    expect(mockFinalizeDeletion).toHaveBeenCalledWith("u1");
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(data.user?.id).toBe("u1");
  });

  it("updates role then finalizeDeletion when both sent", async () => {
    const req = jsonRequest({ status: "DELETED", role: "USER" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { role: "USER" },
    });
    expect(mockFinalizeDeletion).toHaveBeenCalledWith("u1");
  });
});

describe("PATCH /api/admin/users/[id] status ACTIVE", () => {
  it("restores original email from deleted_ placeholder", async () => {
    mockUserFindUnique.mockResolvedValue({
      email: "deleted_u1_person@example.com",
    });
    mockUserUpdate.mockResolvedValue({
      id: "u1",
      email: "person@example.com",
      name: "Ann",
      role: "USER",
      status: "ACTIVE",
    });

    const req = jsonRequest({ status: "ACTIVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    const data = (await res.json()) as { user?: { email: string } };

    expect(res.status).toBe(200);
    expect(mockUserFindFirst).toHaveBeenCalledWith({
      where: { email: "person@example.com", NOT: { id: "u1" } },
      select: { id: true },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({
          status: "ACTIVE",
          email: "person@example.com",
          deletedAt: null,
          deleteAfter: null,
          suspendedAt: null,
        }),
      })
    );
    expect(data.user?.email).toBe("person@example.com");
  });

  it("returns 409 when restored email is taken", async () => {
    mockUserFindUnique.mockResolvedValue({
      email: "deleted_u1_person@example.com",
    });
    mockUserFindFirst.mockResolvedValue({ id: "other-user" });

    const req = jsonRequest({ status: "ACTIVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });

    expect(res.status).toBe(409);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
