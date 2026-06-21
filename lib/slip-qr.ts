/**
 * Decode the "slip verify" mini-QR embedded in Thai bank / e-wallet transfer
 * slips (EMVCo TLV). It carries the sending-bank code + transaction reference
 * (or, for TrueMoney, a transaction id + date) — NOT the transfer amount.
 *
 * Use it to (1) dedupe imported slips by reference and (2) hint the parser which
 * bank produced the slip. Reading the QR *image* (jsQR/zxing) is a separate step;
 * this module only decodes the payload string that scanner produces.
 *
 * Structure (grounded on maythiwat/promptparse):
 *   bank:      00{ 00:"000001", 01:bankCode, 02:transRef }  51:"TH"  91:crc
 *   truemoney: 00{ 00:"01", 01:"01", 02:eventType, 03:txnId, 04:DDMMYYYY }  91:crc
 */

// Thai bank codes (subset; extend as needed).
const BANK_NAMES: Record<string, string> = {
  "002": "ธนาคารกรุงเทพ",
  "004": "ธนาคารกสิกรไทย",
  "006": "ธนาคารกรุงไทย",
  "011": "ธนาคารทหารไทยธนชาต",
  "014": "ธนาคารไทยพาณิชย์",
  "017": "ธนาคารซิตี้แบงก์",
  "020": "ธนาคารสแตนดาร์ดชาร์เตอร์ด",
  "022": "ธนาคารซีไอเอ็มบีไทย",
  "024": "ธนาคารยูโอบี",
  "025": "ธนาคารกรุงศรีอยุธยา",
  "030": "ธนาคารออมสิน",
  "033": "ธนาคารอาคารสงเคราะห์",
  "034": "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
  "066": "ธนาคารอิสลามแห่งประเทศไทย",
  "067": "ธนาคารทิสโก้",
  "069": "ธนาคารเกียรตินาคินภัทร",
  "071": "ธนาคารไทยเครดิต",
  "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์",
};

export type SlipQrResult =
  | {
      kind: "bank";
      sendingBankCode: string;
      sendingBankName: string | null;
      transRef: string;
    }
  | { kind: "truemoney"; eventType: string; transactionId: string; date: string }
  | null;

type Tlv = { id: string; value: string };

/** Decode an EMVCo TLV string: 2-digit id, 2-digit length, then value. */
function decodeTlv(s: string): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const len = Number.parseInt(s.slice(i + 2, i + 4), 10);
    if (!Number.isInteger(len)) break;
    const value = s.slice(i + 4, i + 4 + len);
    if (value.length < len) break;
    out.push({ id, value });
    i += 4 + len;
  }
  return out;
}

export function parseSlipQr(payload: string): SlipQrResult {
  if (typeof payload !== "string" || !/^\d{4}.+/.test(payload)) return null;

  const template = decodeTlv(payload).find((t) => t.id === "00");
  if (!template) return null;

  const sub = decodeTlv(template.value);
  const get = (id: string) => sub.find((t) => t.id === id)?.value;
  const marker = get("00");

  // Bank slip: sub-tag 00 is the fixed "000001" marker.
  if (marker === "000001") {
    const bank = get("01");
    const ref = get("02");
    if (!bank || !ref) return null;
    return {
      kind: "bank",
      sendingBankCode: bank,
      sendingBankName: BANK_NAMES[bank] ?? null,
      transRef: ref,
    };
  }

  // TrueMoney slip: sub 00 = "01", 01 = "01".
  if (marker === "01" && get("01") === "01") {
    const transactionId = get("03");
    if (!transactionId) return null;
    return {
      kind: "truemoney",
      eventType: get("02") ?? "",
      transactionId,
      date: get("04") ?? "",
    };
  }

  return null;
}
