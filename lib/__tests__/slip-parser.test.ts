import { parseSlipText } from "../slip-parser";

describe("parseSlipText", () => {
  const kasikornSample = `9:41 AM
Transaction Completed
Transfer Completed
6 Mar 19 2:46 PM
MR. Kasikorn R
cank
xxx-x-x9917-x
* 100%
MR. Testsam Kasikorn
KBank
032-8-19933-5
Transaction ID:
019065144648708170
Amount:
5,000.00 Baht
Fee:
0.00 Baht
Category: Others
Remaining Bal.: 789,281.03 Baht`;

  it("extracts amount from Kasikorn slip format", () => {
    const result = parseSlipText(kasikornSample);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(5000);
  });

  it("extracts date/time from Kasikorn format", () => {
    const result = parseSlipText(kasikornSample);
    expect(result?.occurredAt).toBeInstanceOf(Date);
    expect(result?.occurredAt?.getFullYear()).toBe(2019);
    expect(result?.occurredAt?.getMonth()).toBe(2); // March = 2
    expect(result?.occurredAt?.getDate()).toBe(6);
    expect(result?.occurredAt?.getHours()).toBe(14); // 2:46 PM = 14:46
    expect(result?.occurredAt?.getMinutes()).toBe(46);
  });

  it("extracts note from meaningful lines", () => {
    const result = parseSlipText(kasikornSample);
    expect(result?.note).toBeDefined();
    expect(result?.note).toContain("Transaction Completed");
    expect(result?.note).toContain("Transfer Completed");
  });

  it("returns null when amount not found", () => {
    expect(parseSlipText("No amount here")).toBeNull();
    expect(parseSlipText("")).toBeNull();
    expect(parseSlipText("Amount: invalid Baht")).toBeNull();
  });

  it("handles amount with commas", () => {
    const result = parseSlipText("Amount:\n1,234,567.89 Baht");
    expect(result?.amount).toBe(1234567.89);
  });

  it("handles amount without decimals", () => {
    const result = parseSlipText("Amount: 100 Baht");
    expect(result?.amount).toBe(100);
  });

  it("handles text with CRLF line endings", () => {
    const text = "Amount:\r\n5,000.00 Baht";
    const result = parseSlipText(text);
    expect(result?.amount).toBe(5000);
  });

  it("returns undefined occurredAt when date format not found", () => {
    const result = parseSlipText("Amount: 100 Baht\nSome other text");
    expect(result?.amount).toBe(100);
    expect(result?.occurredAt).toBeUndefined();
  });

  it("extracts Thai amount without pipes", () => {
    const result = parseSlipText("จำนวน: 888.00 บาท");
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(888);
  });

  it("extracts Thai amount with pipes", () => {
    const text = `จำนวน: | 888.00 บาท |`;
    const result = parseSlipText(text);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(888);
  });

  it("extracts Thai date with 2-digit year (treated as พ.ศ. 25xx)", () => {
    // 65 -> พ.ศ. 2565 -> ค.ศ. 2022
    const result = parseSlipText(
      "Amount: 100 Baht\n25 ม.ค. 65 23:06 น.\n"
    );
    expect(result?.occurredAt).toBeInstanceOf(Date);
    expect(result?.occurredAt?.getFullYear()).toBe(2022);
    expect(result?.occurredAt?.getMonth()).toBe(0);
    expect(result?.occurredAt?.getDate()).toBe(25);
    expect(result?.occurredAt?.getHours()).toBe(23);
    expect(result?.occurredAt?.getMinutes()).toBe(6);
  });

  it("extracts Thai date with 2-digit year 68 (treated as พ.ศ. 2568 = ค.ศ. 2025)", () => {
    // 68 -> พ.ศ. 2568 -> ค.ศ. 2025
    const result = parseSlipText(
      "Amount: 500 Baht\n9 ต.ค. 68 15:46 น.\n"
    );
    expect(result?.occurredAt).toBeInstanceOf(Date);
    expect(result?.occurredAt?.getFullYear()).toBe(2025);
    expect(result?.occurredAt?.getMonth()).toBe(9); // October = 9
    expect(result?.occurredAt?.getDate()).toBe(9);
    expect(result?.occurredAt?.getHours()).toBe(15);
    expect(result?.occurredAt?.getMinutes()).toBe(46);
  });

  it("extracts Thai date with Buddhist Era year", () => {
    const result = parseSlipText(
      "Amount: 100 Baht\n25 ม.ค. 2565 23:06 น.\n"
    );
    expect(result?.occurredAt).toBeInstanceOf(Date);
    expect(result?.occurredAt?.getFullYear()).toBe(2022);
    expect(result?.occurredAt?.getMonth()).toBe(0);
    expect(result?.occurredAt?.getDate()).toBe(25);
    expect(result?.occurredAt?.getHours()).toBe(23);
    expect(result?.occurredAt?.getMinutes()).toBe(6);
  });

  it("parses full Thai Kasikorn slip sample", () => {
    const thaiSample = `17:43

ย้อนกลับ สแกน

ตอนเงินสำเร็จ
25 ม.ค. 65 23:06 น.

จำนวน: | 888.00 บาท |
ค่าธรรมเนียม: | 0.00 บาท |

Verified by K+

บันทึกช่วยจำ:`;
    const result = parseSlipText(thaiSample);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(888);
    expect(result?.occurredAt).toBeInstanceOf(Date);
  });

  it("extracts Thai amount when English pattern is absent", () => {
    const result = parseSlipText("จำนวน: 1,500.50 บาท");
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1500.5);
  });
});
