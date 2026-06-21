import { parseSlipQr } from "../slip-qr";

// Build an EMVCo TLV field: 2-digit id + 2-digit length + value.
const t = (id: string, v: string) => id + String(v.length).padStart(2, "0") + v;

describe("parseSlipQr", () => {
  it("decodes a bank slip mini-QR (bank code + transRef)", () => {
    const template = t("00", "000001") + t("01", "004") + t("02", "015136540241200001");
    const payload = t("00", template) + t("51", "TH") + "9104ABCD";

    const result = parseSlipQr(payload);
    expect(result).toEqual({
      kind: "bank",
      sendingBankCode: "004",
      sendingBankName: "ธนาคารกสิกรไทย",
      transRef: "015136540241200001",
    });
  });

  it("returns null bank name for an unknown bank code", () => {
    const template = t("00", "000001") + t("01", "999") + t("02", "REF123");
    const payload = t("00", template) + t("51", "TH") + "9104ABCD";
    const result = parseSlipQr(payload);
    expect(result?.kind).toBe("bank");
    if (result?.kind === "bank") {
      expect(result.sendingBankName).toBeNull();
      expect(result.sendingBankCode).toBe("999");
    }
  });

  it("decodes a TrueMoney slip mini-QR (txn id + date)", () => {
    const template =
      t("00", "01") + t("01", "01") + t("02", "P2P") + t("03", "TXN123456") + t("04", "26012565");
    const payload = t("00", template) + "9104XXXX";

    const result = parseSlipQr(payload);
    expect(result).toEqual({
      kind: "truemoney",
      eventType: "P2P",
      transactionId: "TXN123456",
      date: "26012565",
    });
  });

  it("rejects non-slip / malformed payloads", () => {
    expect(parseSlipQr("")).toBeNull();
    expect(parseSlipQr("hello")).toBeNull();
    expect(parseSlipQr("0000")).toBeNull();
    // PromptPay payment QR (template tag 29/30, no slip marker) → not a slip
    expect(parseSlipQr("00020101021129370016A000000677010111")).toBeNull();
  });
});
