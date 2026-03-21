import { pickPreferredAccountId, sortAccountsByRecent } from "../recent-financial-accounts";

describe("sortAccountsByRecent", () => {
  it("orders by recent ids first, then the rest", () => {
    const accounts = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const recent = ["c", "a"];
    expect(sortAccountsByRecent(accounts, recent)).toEqual([
      { id: "c", name: "C" },
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
  });

  it("ignores recent ids that are not in accounts", () => {
    const accounts = [{ id: "x", name: "X" }];
    expect(sortAccountsByRecent(accounts, ["missing", "x"])).toEqual([{ id: "x", name: "X" }]);
  });
});

describe("pickPreferredAccountId", () => {
  it("returns first account that appears in recentIds", () => {
    const accounts = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ];
    expect(pickPreferredAccountId(accounts, ["b", "a"])).toEqual({ id: "b", name: "B" });
  });

  it("returns null when no recent id matches", () => {
    expect(pickPreferredAccountId([{ id: "a", name: "A" }], [])).toBeNull();
  });
});
