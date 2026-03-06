/**
 * @jest-environment node
 */
const mockCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { GET } from "@/app/api/users/active-count/route";
import { createRequest } from "../helpers/api-helper";

beforeEach(() => jest.clearAllMocks());

describe("GET /api/users/active-count", () => {
  it("returns count with default 5 minutes", async () => {
    mockCount.mockResolvedValue(42);
    const req = createRequest("http://localhost/api/users/active-count");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(42);
    expect(data.minutes).toBe(5);
  });

  it("accepts custom minutes param", async () => {
    mockCount.mockResolvedValue(10);
    const req = createRequest(
      "http://localhost/api/users/active-count?minutes=30"
    );
    const res = await GET(req);
    const data = await res.json();
    expect(data.minutes).toBe(30);
  });

  it("clamps minutes to max 60", async () => {
    mockCount.mockResolvedValue(5);
    const req = createRequest(
      "http://localhost/api/users/active-count?minutes=120"
    );
    const res = await GET(req);
    const data = await res.json();
    expect(data.minutes).toBe(60);
  });

  it("clamps minutes to min 1", async () => {
    mockCount.mockResolvedValue(1);
    const req = createRequest(
      "http://localhost/api/users/active-count?minutes=0"
    );
    const res = await GET(req);
    const data = await res.json();
    expect(data.minutes).toBe(5);
  });
});
