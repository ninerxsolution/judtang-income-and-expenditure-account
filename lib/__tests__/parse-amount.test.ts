/**
 * @jest-environment node
 */
import { parseAmountInput } from "../parse-amount";

describe("parseAmountInput", () => {
  it("parses plain numbers", () => {
    expect(parseAmountInput("100")).toBe(100);
    expect(parseAmountInput("100.50")).toBe(100.5);
  });

  it("strips commas", () => {
    expect(parseAmountInput("1,234.56")).toBe(1234.56);
  });

  it("trims whitespace", () => {
    expect(parseAmountInput("  42  ")).toBe(42);
  });

  it("returns NaN for empty", () => {
    expect(parseAmountInput("")).toBeNaN();
    expect(parseAmountInput("   ")).toBeNaN();
  });

  it("returns NaN for invalid", () => {
    expect(parseAmountInput("abc")).toBeNaN();
  });
});
