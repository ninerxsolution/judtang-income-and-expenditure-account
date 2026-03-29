/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { resolveUserStatus } from "../user-status";

describe("resolveUserStatus", () => {
  it("returns ACTIVE for ACTIVE user", () => {
    expect(
      resolveUserStatus({ status: "ACTIVE", deleteAfter: null })
    ).toBe("ACTIVE");
  });

  it("returns SUSPENDED when grace period not passed", () => {
    const future = new Date(Date.now() + 86400000);
    expect(
      resolveUserStatus({ status: "SUSPENDED", deleteAfter: future })
    ).toBe("SUSPENDED");
  });

  it("returns DELETED when SUSPENDED and deleteAfter passed", () => {
    const past = new Date(Date.now() - 86400000);
    expect(
      resolveUserStatus({ status: "SUSPENDED", deleteAfter: past })
    ).toBe("DELETED");
  });

  it("returns DELETED for status DELETED", () => {
    expect(
      resolveUserStatus({ status: "DELETED", deleteAfter: null })
    ).toBe("DELETED");
  });
});
