/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockCreateActivityLog = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/activity-log", () => ({
  createActivityLog: (...args: unknown[]) => mockCreateActivityLog(...args),
  ActivityLogAction: { USER_LOGGED_OUT: "USER_LOGGED_OUT" },
}));

import { POST } from "@/app/api/auth/logout/route";
import { createMockSession } from "../../helpers/api-helper";

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/logout", () => {
  it("returns ok even when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockCreateActivityLog).not.toHaveBeenCalled();
  });

  it("creates activity log when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockCreateActivityLog.mockResolvedValue(undefined);
    const res = await POST();
    expect(res.status).toBe(200);
  });
});
