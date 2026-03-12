/**
 * @jest-environment node
 */
import { GET } from "@/app/api/dev/route";

describe("GET /api/dev", () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  it("returns 404 when not in development", async () => {
    process.env.NODE_ENV = "production";
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns payload in development", async () => {
    process.env.NODE_ENV = "development";
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain("Dev playground");
  });
});
