/**
 * @jest-environment node
 */
import { GET } from "@/app/api/dev/route";

describe("GET /api/dev", () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: origEnv, writable: true });
  });

  it("returns 404 when not in development", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns payload in development", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain("Dev playground");
  });
});
