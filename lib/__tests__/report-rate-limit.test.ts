import { checkReportRateLimit, incrementReportRateLimit } from "../report-rate-limit";

describe("report-rate-limit", () => {
  const userId = `test-user-${Date.now()}`;

  it("allows first request", () => {
    const result = checkReportRateLimit(userId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("decrements remaining after increment", () => {
    const uid = `user-decr-${Date.now()}`;
    incrementReportRateLimit(uid);
    const result = checkReportRateLimit(uid);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks after 5 increments", () => {
    const uid = `user-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      incrementReportRateLimit(uid);
    }
    const result = checkReportRateLimit(uid);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("still blocked at exactly 5", () => {
    const uid = `user-exact-${Date.now()}`;
    for (let i = 0; i < 5; i++) incrementReportRateLimit(uid);
    const check = checkReportRateLimit(uid);
    expect(check.allowed).toBe(false);
  });
});
