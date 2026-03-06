/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

import { POST } from "@/app/api/auth/heartbeat/route";
import { createMockSession } from "../../helpers/api-helper";

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/heartbeat", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("updates lastActiveAt and returns ok", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserUpdate.mockResolvedValue({});
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalled();
  });
});
