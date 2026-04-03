import { sortCategoriesByRecent } from "../recent-categories";

describe("sortCategoriesByRecent", () => {
  it("orders by recent ids first, then the rest", () => {
    const categories = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const recent = ["c", "a"];
    expect(sortCategoriesByRecent(categories, recent)).toEqual([
      { id: "c", name: "C" },
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
  });

  it("ignores recent ids that are not in categories", () => {
    const categories = [{ id: "x", name: "X" }];
    expect(sortCategoriesByRecent(categories, ["missing", "x"])).toEqual([{ id: "x", name: "X" }]);
  });
});
