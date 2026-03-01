/**
 * Card types/brands for credit/debit cards.
 * Used in financial account form when type is CREDIT_CARD.
 */
export const CARD_TYPES = [
  { id: "credit", nameTh: "บัตรเครดิต", nameEn: "Credit" },
  { id: "debit", nameTh: "บัตรเดบิต", nameEn: "Debit" },
  { id: "visa", nameTh: "วีซ่า", nameEn: "Visa" },
  { id: "master", nameTh: "มาสเตอร์การ์ด", nameEn: "Mastercard" },
  { id: "jcb", nameTh: "เจซีบี", nameEn: "JCB" },
  { id: "amex", nameTh: "อเมริกันเอ็กซ์เพรส", nameEn: "American Express" },
  { id: "unionpay", nameTh: "ยูเนี่ยนเพย์", nameEn: "UnionPay" },
  { id: "truemoney", nameTh: "ทรูมันนี่", nameEn: "TrueMoney" },
  { id: "other", nameTh: "อื่นๆ", nameEn: "Other" },
] as const;

export const CARD_TYPE_OTHER = "other" as const;

export type CardTypeId = (typeof CARD_TYPES)[number]["id"];

export function getCardTypeDisplayName(
  cardTypeId: string | null | undefined,
  locale: "th" | "en" = "th"
): string | null {
  if (!cardTypeId || cardTypeId === CARD_TYPE_OTHER) return null;
  const card = CARD_TYPES.find((c) => c.id === cardTypeId);
  return card ? (locale === "th" ? card.nameTh : card.nameEn) : cardTypeId;
}
