import { parseSlipText } from "../slip-parser";

/**
 * Multi-bank corpus for the slip parser. Each entry feeds raw OCR text through
 * parseSlipText and checks the extracted amount (+ date when present).
 *
 * `real: true`  = actual Tesseract output from a real slip (ground truth read
 *                 visually from the slip image).
 * `real: false` = representative text built from that bank's known label/date
 *                 conventions. Replace these with real OCR as slips are added to
 *                 research/slip-ocr/samples/.
 *
 * NOTE: the KBank entry embeds สระอำ in its decomposed form (ํา) on the
 * "จํานวน" label, exactly as Tesseract emits it, to test normalization.
 */
type Fixture = {
  provider: string;
  real: boolean;
  text: string;
  expectedAmount: number;
  expectedDate?: { y: number; m: number; d: number }; // m is 0-based
};

const FIXTURES: Fixture[] = [
  {
    provider: "kbank",
    real: true,
    text: [
      "9:41                                   all § Em)",
      "ทารายการสําเรจ              @)",
      "โอนเจินสําเร็จ                  ไ<+",
      "26 ม.ค. 65 05:10 น,",
      "นายกสิกร รักไทย",
      "ธ.กสิกรไทย",
      "XXX-X-X8888-x",
      "เลขที่รายการ:",
      "123456789012345678 ogg pki Kew",
      "จํานวน:                           กระโรรรร",
      "888.00 บาท            ไนว",
      "ค่าธรรมเนียม:                     [ๆ ๐ 1",
      "0.00 บาท      verified by Ke",
      "ประเภท: อื่นๆ",
      "ยอดเงินคงเหลือ: 83,888.00 บาท",
    ].join("\n"),
    expectedAmount: 888,
    expectedDate: { y: 2022, m: 0, d: 26 },
  },
  {
    provider: "scb",
    real: false,
    text: [
      "โอนเงินสำเร็จ",
      "26 ม.ค. 2565 14:30 น.",
      "จำนวนเงิน 1,500.00 บาท",
      "ค่าธรรมเนียม 0.00 บาท",
    ].join("\n"),
    expectedAmount: 1500,
    expectedDate: { y: 2022, m: 0, d: 26 },
  },
  {
    provider: "bbl",
    real: false,
    text: [
      "โอนเงินสำเร็จ",
      "26/01/2565 14:30",
      "จำนวนเงิน 2,000.00 บาท",
      "ค่าธรรมเนียม 0.00 บาท",
      "ยอดคงเหลือ 50,000.00 บาท",
    ].join("\n"),
    expectedAmount: 2000,
    expectedDate: { y: 2022, m: 0, d: 26 },
  },
  {
    provider: "ktb",
    real: false,
    text: [
      "รายการสำเร็จ",
      "26 มกราคม 2565",
      "จำนวน 3,250.75 บาท",
      "ค่าธรรมเนียม 0.00 บาท",
    ].join("\n"),
    expectedAmount: 3250.75,
    expectedDate: { y: 2022, m: 0, d: 26 },
  },
  {
    provider: "bay",
    real: false,
    text: [
      "โอนเงินสำเร็จ",
      "9 ต.ค. 68 09:15 น.",
      "จำนวนเงินที่โอน 500.00 บาท",
    ].join("\n"),
    expectedAmount: 500,
    expectedDate: { y: 2025, m: 9, d: 9 },
  },
  {
    provider: "ttb",
    real: false,
    text: [
      "ทำรายการสำเร็จ",
      "26/01/68",
      "ยอดเงิน 750.00 บาท",
      "ค่าธรรมเนียม 0.00 บาท",
    ].join("\n"),
    expectedAmount: 750,
    expectedDate: { y: 2025, m: 0, d: 26 },
  },
  {
    provider: "truemoney",
    real: false,
    text: ["ชำระเงินสำเร็จ", "26 ม.ค. 2565 18:00 น.", "ยอดเงิน 99.00 บาท"].join("\n"),
    expectedAmount: 99,
    expectedDate: { y: 2022, m: 0, d: 26 },
  },
  {
    provider: "promptpay-en",
    real: false,
    text: [
      "Transfer successful",
      "Amount 1,234.00 THB",
      "Fee 0.00 THB",
      "Balance 9,999.00 THB",
    ].join("\n"),
    expectedAmount: 1234,
  },
  {
    provider: "disambiguation",
    real: false,
    text: ["จำนวนเงิน 100.00 บาท", "ยอดคงเหลือ 999,999.00 บาท"].join("\n"),
    expectedAmount: 100,
  },
  {
    provider: "gsb-thai-numerals",
    real: false,
    text: ["โอนเงินสำเร็จ", "26 ม.ค. 2565 14:30 น.", "จำนวนเงิน ๑,๒๓๔.๐๐ บาท"].join("\n"),
    expectedAmount: 1234,
    expectedDate: { y: 2022, m: 0, d: 26 },
  },
  {
    provider: "baht-prefix",
    real: false,
    text: ["โอนเงินสำเร็จ", "ยอดเงิน ฿2,500"].join("\n"),
    expectedAmount: 2500,
  },

  // --- Transcribed from real slip images (layout-accurate, clean text).
  // Real Tesseract OCR of these (with watermarks/noise) replaces them once the
  // image files are OCR'd; see research/slip-ocr/README.md.
  {
    provider: "scb-real",
    real: false,
    text: [
      "โอนเงินสำเร็จ",
      "11 พ.ค. 2567 - 02:57",
      "รหัสอ้างอิง: 202405116xividr4PCyphGV6f",
      "จาก นาย เฉลิมพงษ์ กลางกุลนารถ",
      "xxx-xxx928-5",
      "ไปยัง MR. SAW AUNG MYO THU -",
      "1803299311",
      "จำนวนเงิน 1,000.02",
    ].join("\n"),
    expectedAmount: 1000.02,
    expectedDate: { y: 2024, m: 4, d: 11 }, // พ.ค. = May, 2567 -> 2024
  },
  {
    // REAL Tesseract output of the Krungsri slip (samples/s3ows6i634OAq5lwmSQK-o.jpg).
    // Note the spaces Tesseract inserts between Thai glyphs and the lost decimal
    // point ("50 00 THB") — both are handled by normalizeOcrText.
    provider: "bay-real-ocr",
    real: true,
    text: [
      "๒ ๑ [=",
      "@ โอ น เง ิ น ส ํ า เร ็ จ",
      "ก 28 ต . ค . 2566 17:41:13",
      "PREECHA BIRD",
      "XXX-1-32910-X",
      "@© XXX-4-15468-X",
      "จ ํ า น ว น เง ิ น 50 00 THB",
      "ค ่ า ธร ร ม เน ี ย ม 0.00 THB",
      "ห ม า ย เล ขอ ้ า ง อ ิ ง",
      "BAYM2494437525 RE ร A:",
    ].join("\n"),
    expectedAmount: 50,
    expectedDate: { y: 2023, m: 9, d: 28 }, // ต.ค. = Oct, 2566 -> 2023
  },
  {
    provider: "bay-mock",
    real: false,
    text: [
      "12:00",
      "โอนเงินสำเร็จ",
      "01 ม.ค. 2568 12:00:00",
      "กรุงศรี ง่ายกว่าเดิม",
      "777-9-12345-6",
      "บิลลี่ เบลล่า",
      "777-7-12345-6",
      "จำนวนเงิน 5,000.00 THB",
      "ค่าธรรมเนียม 0.00 THB",
      "หมายเลขอ้างอิง BAYM123456789",
    ].join("\n"),
    expectedAmount: 5000,
    expectedDate: { y: 2025, m: 0, d: 1 }, // ม.ค. = Jan, 2568 -> 2025
  },
];

describe("slip parser corpus (multi-bank)", () => {
  it.each(FIXTURES)(
    "[$provider] (real=$real) extracts the correct amount",
    ({ text, expectedAmount }) => {
      const result = parseSlipText(text);
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(expectedAmount);
    },
  );

  it.each(FIXTURES.filter((f) => f.expectedDate))(
    "[$provider] extracts the correct date",
    (fixture) => {
      const d = parseSlipText(fixture.text)?.occurredAt;
      expect(d).toBeInstanceOf(Date);
      expect(d?.getFullYear()).toBe(fixture.expectedDate!.y);
      expect(d?.getMonth()).toBe(fixture.expectedDate!.m);
      expect(d?.getDate()).toBe(fixture.expectedDate!.d);
    },
  );

  it("reports corpus coverage", () => {
    const real = FIXTURES.filter((f) => f.real).length;
    const pass = FIXTURES.filter((f) => parseSlipText(f.text)?.amount === f.expectedAmount).length;
    // Visible in jest output; turns "perfect" into a measurable number.
    console.log(
      `slip corpus: ${pass}/${FIXTURES.length} amount-pass | real slips: ${real}/${FIXTURES.length} | providers: ${[
        ...new Set(FIXTURES.map((f) => f.provider)),
      ].join(", ")}`,
    );
    expect(pass).toBe(FIXTURES.length);
  });
});
