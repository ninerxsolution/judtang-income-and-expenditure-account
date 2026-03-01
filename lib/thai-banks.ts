/**
 * Thai commercial banks and state-owned banks.
 * Used for bank dropdown in financial account form.
 * Sorted by popularity (major banks first).
 */
export const THAI_BANKS = [
  // Major commercial banks
  { id: "bangkok", nameTh: "ธนาคารกรุงเทพ", nameEn: "Bangkok Bank" },
  { id: "kasikorn", nameTh: "ธนาคารกสิกรไทย", nameEn: "Kasikorn Bank" },
  { id: "krungthai", nameTh: "ธนาคารกรุงไทย", nameEn: "Krungthai Bank" },
  { id: "scb", nameTh: "ธนาคารไทยพาณิชย์", nameEn: "Siam Commercial Bank" },
  { id: "ttb", nameTh: "ธนาคารทหารไทยธนชาต", nameEn: "TMBThanachart Bank" },
  { id: "krungsri", nameTh: "ธนาคารกรุงศรีอยุธยา", nameEn: "Bank of Ayudhya (Krungsri)" },
  { id: "uob", nameTh: "ธนาคารยูโอบี", nameEn: "United Overseas Bank (Thai)" },
  { id: "cimb", nameTh: "ธนาคารซีไอเอ็มบี ไทย", nameEn: "CIMB Thai Bank" },
  { id: "lhbank", nameTh: "ธนาคารแลนด์ แอนด์ เฮ้าส์", nameEn: "Land & Houses Bank" },
  { id: "tisco", nameTh: "ธนาคารทิสโก้", nameEn: "Tisco Bank" },
  { id: "kkp", nameTh: "ธนาคารเกียรตินาคินภัทร", nameEn: "Kiatnakin Phatra Bank" },
  { id: "scbt", nameTh: "ธนาคารสแตนดาร์ดชาร์เตอร์ด ไทย", nameEn: "Standard Chartered Bank (Thailand)" },
  { id: "icbc", nameTh: "ธนาคารไอซีบีซี (ไทย)", nameEn: "ICBC Thai" },
  { id: "tcb", nameTh: "ธนาคารไทยเครดิต", nameEn: "Thai Credit Bank" },
  // State-owned / specialized
  { id: "gsb", nameTh: "ธนาคารออมสิน", nameEn: "Government Savings Bank" },
  { id: "ghb", nameTh: "ธนาคารอาคารสงเคราะห์", nameEn: "GH Bank" },
  { id: "baac", nameTh: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", nameEn: "Bank for Agriculture (BAAC)" },
  { id: "exim", nameTh: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย", nameEn: "Export-Import Bank of Thailand" },
  { id: "islamic", nameTh: "ธนาคารอิสลามแห่งประเทศไทย", nameEn: "Islamic Bank of Thailand" },
  { id: "sme", nameTh: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย", nameEn: "SME Development Bank of Thailand" },
] as const;

export const BANK_OTHER = "other" as const;

export type ThaiBankId = (typeof THAI_BANKS)[number]["id"] | typeof BANK_OTHER;

/**
 * Get display name for bank by id and locale.
 */
export function getBankDisplayName(
  bankId: string | null | undefined,
  locale: "th" | "en" = "th"
): string | null {
  if (!bankId || bankId === BANK_OTHER) return null;
  const bank = THAI_BANKS.find((b) => b.id === bankId);
  return bank ? (locale === "th" ? bank.nameTh : bank.nameEn) : bankId;
}
