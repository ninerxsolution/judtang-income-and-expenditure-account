/**
 * @jest-environment node
 */
import {
  budgetIndicatorProgressBarClass,
  budgetIndicatorBadgeClass,
  budgetIndicatorMetaTextClass,
} from "../budget-indicator-ui";

describe("budget-indicator-ui", () => {
  it("budgetIndicatorProgressBarClass maps known indicators", () => {
    expect(budgetIndicatorProgressBarClass("over")).toContain("red");
    expect(budgetIndicatorProgressBarClass("critical")).toContain("orange");
    expect(budgetIndicatorProgressBarClass("warning")).toContain("amber");
    expect(budgetIndicatorProgressBarClass("normal")).toContain("emerald");
  });

  it("budgetIndicatorProgressBarClass normalizes unknown to normal", () => {
    expect(budgetIndicatorProgressBarClass("unknown")).toBe(
      budgetIndicatorProgressBarClass("normal"),
    );
  });

  it("budgetIndicatorBadgeClass returns non-empty for each state", () => {
    for (const ind of ["normal", "warning", "critical", "over"] as const) {
      expect(budgetIndicatorBadgeClass(ind).length).toBeGreaterThan(10);
    }
  });

  it("budgetIndicatorMetaTextClass differs for over vs normal", () => {
    expect(budgetIndicatorMetaTextClass("over")).not.toBe(
      budgetIndicatorMetaTextClass("normal"),
    );
  });
});
