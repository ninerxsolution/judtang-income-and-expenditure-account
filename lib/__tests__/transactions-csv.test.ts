import {
  serializeTransactionsToCsv,
  parseTransactionsCsv,
} from "../transactions-csv";

describe("transactions-csv", () => {
  const sampleTransactions = [
    {
      id: "tx-1",
      userId: "user-1",
      type: "EXPENSE",
      amount: 100,
      category: "อาหาร",
      note: "Lunch",
      occurredAt: new Date("2025-01-15T10:00:00Z"),
      createdAt: new Date("2025-01-15T10:00:00Z"),
      financialAccountId: "acc-1",
      transferAccountId: null,
      categoryId: null,
      status: "POSTED",
      statementId: null,
      postedDate: null,
      updatedAt: new Date("2025-01-15T10:00:00Z"),
    },
  ] as unknown as Parameters<typeof serializeTransactionsToCsv>[0];

  describe("serializeTransactionsToCsv", () => {
    it("produces CSV with BOM and header", () => {
      const csv = serializeTransactionsToCsv([]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain("id,type,amount,category,note,occurredAt,createdAt");
    });
    it("serializes transactions with correct columns", () => {
      const csv = serializeTransactionsToCsv(sampleTransactions);
      expect(csv).toContain("tx-1");
      expect(csv).toContain("EXPENSE");
      expect(csv).toContain("100.00");
      expect(csv).toContain("อาหาร");
    });
    it("escapes fields with commas", () => {
      const tx = [
        {
          ...sampleTransactions[0],
          note: "Lunch, coffee",
        },
      ];
      const csv = serializeTransactionsToCsv(tx);
      expect(csv).toContain('"Lunch, coffee"');
    });
  });

  describe("parseTransactionsCsv", () => {
    it("throws for empty CSV", () => {
      expect(() => parseTransactionsCsv("")).toThrow("CSV is empty");
    });
    it("throws when required columns missing", () => {
      const csv = "\uFEFFid,amount\n1,100";
      expect(() => parseTransactionsCsv(csv)).toThrow("missing required columns");
    });
    it("parses valid CSV with all required columns", () => {
      const header =
        "id,type,amount,category,note,occurredAt,createdAt,financialAccountId,transferAccountId,categoryId";
      const row =
        "tx-1,EXPENSE,100.00,อาหาร,Lunch,2025-01-15T10:00:00.000Z,2025-01-15T10:00:00.000Z,,,";
      const csv = `\uFEFF${header}\n${row}`;
      const result = parseTransactionsCsv(csv);
      expect(result).toHaveLength(1);
      expect(result[0].rowNumber).toBe(2);
      expect(result[0].values.id).toBe("tx-1");
      expect(result[0].values.type).toBe("EXPENSE");
      expect(result[0].values.amount).toBe("100.00");
    });
    it("skips empty rows", () => {
      const header =
        "id,type,amount,category,note,occurredAt,createdAt,financialAccountId,transferAccountId,categoryId";
      const csv = `\uFEFF${header}\n\n\n`;
      const result = parseTransactionsCsv(csv);
      expect(result).toHaveLength(0);
    });
    it("round-trips serialize then parse", () => {
      const csv = serializeTransactionsToCsv(sampleTransactions);
      const parsed = parseTransactionsCsv(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].values.id).toBe("tx-1");
      expect(parsed[0].values.amount).toBe("100.00");
    });
  });
});
