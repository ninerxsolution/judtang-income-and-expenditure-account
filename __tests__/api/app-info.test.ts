/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

import { GET } from "@/app/api/app-info/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/app-info", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns app metadata when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("appName");
    expect(data).toHaveProperty("appVersion");
    expect(data).toHaveProperty("patchVersion");
    expect(data).toHaveProperty("fullVersion");
  });
});
