import {
  loadMonthlyEntryDraft,
  saveMonthlyEntryDraft,
  clearMonthlyEntryDraft,
  isMonthlyEntryDraftEmpty,
  type MonthlyEntryDraft,
} from "@/lib/monthly-entry-draft";

// Minimal localStorage mock (jest runs in node env without window).
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
  keyCount(): number {
    return Object.keys(this.store).length;
  }
}

let ls: LocalStorageMock;

beforeEach(() => {
  ls = new LocalStorageMock();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: ls },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  // @ts-expect-error cleanup test globals
  delete globalThis.window;
  // @ts-expect-error cleanup test globals
  delete globalThis.localStorage;
});

function sampleDraft(): MonthlyEntryDraft {
  return {
    5: [
      {
        id: "row_1",
        type: "EXPENSE",
        amount: "120.50",
        categoryId: "cat_food",
        financialAccountId: "acc_a",
        transferAccountId: "",
        note: "lunch",
      },
    ],
    12: [
      {
        id: "row_2",
        type: "TRANSFER",
        amount: "1000",
        categoryId: "",
        financialAccountId: "acc_a",
        transferAccountId: "acc_b",
        note: "",
      },
    ],
  };
}

describe("monthly-entry-draft", () => {
  it("round-trips a draft for a given year/month", () => {
    const draft = sampleDraft();
    saveMonthlyEntryDraft(2026, 4, draft);
    expect(loadMonthlyEntryDraft(2026, 4)).toEqual(draft);
  });

  it("isolates drafts per month", () => {
    saveMonthlyEntryDraft(2026, 4, sampleDraft());
    expect(loadMonthlyEntryDraft(2026, 5)).toEqual({});
  });

  it("removes the key (does not write) when saving an empty draft", () => {
    saveMonthlyEntryDraft(2026, 4, sampleDraft());
    expect(ls.keyCount()).toBe(1);
    saveMonthlyEntryDraft(2026, 4, {});
    expect(ls.keyCount()).toBe(0);
    expect(loadMonthlyEntryDraft(2026, 4)).toEqual({});
  });

  it("clears a draft explicitly", () => {
    saveMonthlyEntryDraft(2026, 4, sampleDraft());
    clearMonthlyEntryDraft(2026, 4);
    expect(loadMonthlyEntryDraft(2026, 4)).toEqual({});
  });

  it("returns {} for corrupt JSON", () => {
    ls.setItem("judtang_monthly_entry_draft_v1_2026_4", "{not json");
    expect(loadMonthlyEntryDraft(2026, 4)).toEqual({});
  });

  it("drops malformed rows and out-of-range days on load", () => {
    ls.setItem(
      "judtang_monthly_entry_draft_v1_2026_4",
      JSON.stringify({
        3: [
          { id: "ok", type: "INCOME", amount: "5", categoryId: "", financialAccountId: "", transferAccountId: "", note: "" },
          { type: "EXPENSE" }, // no id -> dropped
          "garbage", // -> dropped
        ],
        99: [{ id: "x", type: "EXPENSE", amount: "1", categoryId: "", financialAccountId: "", transferAccountId: "", note: "" }], // bad day -> dropped
      }),
    );
    const loaded = loadMonthlyEntryDraft(2026, 4);
    expect(Object.keys(loaded)).toEqual(["3"]);
    expect(loaded[3]).toHaveLength(1);
    expect(loaded[3][0].id).toBe("ok");
  });

  it("coerces an unknown type to EXPENSE", () => {
    ls.setItem(
      "judtang_monthly_entry_draft_v1_2026_4",
      JSON.stringify({
        1: [{ id: "x", type: "WEIRD", amount: "1", categoryId: "", financialAccountId: "", transferAccountId: "", note: "" }],
      }),
    );
    expect(loadMonthlyEntryDraft(2026, 4)[1][0].type).toBe("EXPENSE");
  });

  it("isMonthlyEntryDraftEmpty detects empty vs non-empty", () => {
    expect(isMonthlyEntryDraftEmpty({})).toBe(true);
    expect(isMonthlyEntryDraftEmpty({ 5: [] })).toBe(true);
    expect(isMonthlyEntryDraftEmpty(sampleDraft())).toBe(false);
  });
});
