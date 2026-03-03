/**
 * Bank logo URLs from thai-banks-logo (https://github.com/casperstack/thai-banks-logo).
 * Used for bank dropdown in financial account form.
 * Banks not in this map fall back to abbr display.
 */
const BANK_LOGO_URLS: Record<string, string> = {
  bangkok: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/BBL.png",
  kasikorn: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/KBANK.png",
  krungthai: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/KTB.png",
  scb: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/SCB.png",
  ttb: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/TTB.png",
  krungsri: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/BAY.png",
  uob: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/UOB.png",
  cimb: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/CIMB.png",
  lhbank: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/LHB.png",
  tisco: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/TISCO.png",
  kkp: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/KKP.png",
  icbc: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/ICBC.png",
  tcb: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/TCRB.png",
  gsb: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/GSB.png",
  ghb: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/GHB.png",
  baac: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/BAAC.png",
  islamic: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/IBANK.png",
  truemoney: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/TrueMoney.png",
};

/**
 * Bank brand colors from thai-banks-logo (hex).
 */
const BANK_BRAND_COLORS: Record<string, string> = {
  bangkok: "#29449D",
  kasikorn: "#1DA858",
  krungthai: "#1DA8E6",
  scb: "#543186",
  ttb: "#0C55F2",
  krungsri: "#FFD51C",
  uob: "#E41A26",
  cimb: "#BD1325",
  lhbank: "#727375",
  tisco: "#267CBC",
  kkp: "#5A547C",
  icbc: "#CD1511",
  tcb: "#FF7813",
  gsb: "#ED1891",
  ghb: "#FF8614",
  baac: "#CCA41C",
  islamic: "#164626",
  truemoney: "#EE252B",
};

/**
 * Get bank logo URL from thai-banks-logo, or null if not available.
 */
export function getBankLogoUrl(bankId: string): string | null {
  return BANK_LOGO_URLS[bankId] ?? null;
}

/**
 * Get bank brand color (hex) from thai-banks-logo, or null if not available.
 */
export function getBankColor(bankId: string): string | null {
  return BANK_BRAND_COLORS[bankId] ?? null;
}

/**
 * Get contrast text color (white or black) for a hex background.
 * Uses relative luminance; threshold 0.4 for readability.
 */
export function getContrastTextColor(hexColor: string): "white" | "black" {
  const hex = hexColor.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.4 ? "black" : "white";
}

/**
 * Thai commercial banks and state-owned banks.
 * Used for bank dropdown in financial account form.
 * Sorted by popularity (major banks first).
 * abbr: 2-letter abbreviation for icon display.
 * color: Tailwind bg color class for bank icon circle.
 */
const BANK_COLORS = [
  "bg-blue-500",
  "bg-green-600",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-purple-600",
  "bg-fuchsia-600",
  "bg-pink-600",
  "bg-rose-600",
  "bg-red-600",
  "bg-orange-600",
  "bg-amber-600",
  "bg-yellow-600",
  "bg-lime-600",
  "bg-[#5C6B52]",
  "bg-[#6B9E5E]",
  "bg-[#8B5E3C]",
] as const;

export const THAI_BANKS = [
  // Major commercial banks
  { id: "bangkok", nameTh: "ธนาคารกรุงเทพ", nameEn: "Bangkok Bank", abbr: "BB" },
  { id: "kasikorn", nameTh: "ธนาคารกสิกรไทย", nameEn: "Kasikorn Bank", abbr: "KB" },
  { id: "krungthai", nameTh: "ธนาคารกรุงไทย", nameEn: "Krungthai Bank", abbr: "KT" },
  { id: "scb", nameTh: "ธนาคารไทยพาณิชย์", nameEn: "Siam Commercial Bank", abbr: "SCB" },
  { id: "ttb", nameTh: "ธนาคารทหารไทยธนชาต", nameEn: "TMBThanachart Bank", abbr: "TTB" },
  { id: "krungsri", nameTh: "ธนาคารกรุงศรีอยุธยา", nameEn: "Bank of Ayudhya (Krungsri)", abbr: "KS" },
  { id: "uob", nameTh: "ธนาคารยูโอบี", nameEn: "United Overseas Bank (Thai)", abbr: "UOB" },
  { id: "cimb", nameTh: "ธนาคารซีไอเอ็มบี ไทย", nameEn: "CIMB Thai Bank", abbr: "CIMB" },
  { id: "lhbank", nameTh: "ธนาคารแลนด์ แอนด์ เฮ้าส์", nameEn: "Land & Houses Bank", abbr: "LH" },
  { id: "tisco", nameTh: "ธนาคารทิสโก้", nameEn: "Tisco Bank", abbr: "TIS" },
  { id: "kkp", nameTh: "ธนาคารเกียรตินาคินภัทร", nameEn: "Kiatnakin Phatra Bank", abbr: "KKP" },
  { id: "scbt", nameTh: "ธนาคารสแตนดาร์ดชาร์เตอร์ด ไทย", nameEn: "Standard Chartered Bank (Thailand)", abbr: "SC" },
  { id: "icbc", nameTh: "ธนาคารไอซีบีซี (ไทย)", nameEn: "ICBC Thai", abbr: "ICBC" },
  { id: "tcb", nameTh: "ธนาคารไทยเครดิต", nameEn: "Thai Credit Bank", abbr: "TCB" },
  // State-owned / specialized
  { id: "gsb", nameTh: "ธนาคารออมสิน", nameEn: "Government Savings Bank", abbr: "GSB" },
  { id: "ghb", nameTh: "ธนาคารอาคารสงเคราะห์", nameEn: "GH Bank", abbr: "GHB" },
  { id: "baac", nameTh: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", nameEn: "Bank for Agriculture (BAAC)", abbr: "BAAC" },
  { id: "exim", nameTh: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย", nameEn: "Export-Import Bank of Thailand", abbr: "EXIM" },
  { id: "islamic", nameTh: "ธนาคารอิสลามแห่งประเทศไทย", nameEn: "Islamic Bank of Thailand", abbr: "IB" },
  { id: "sme", nameTh: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย", nameEn: "SME Development Bank of Thailand", abbr: "SME" },
] as const;

export function getBankIconColor(index: number): (typeof BANK_COLORS)[number] {
  return BANK_COLORS[index % BANK_COLORS.length];
}

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
