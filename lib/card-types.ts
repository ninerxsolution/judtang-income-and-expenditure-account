/**
 * Card account types (how you pay) and card networks (payment processing).
 * Used in financial account form when type is CREDIT_CARD.
 *
 * Card Account Type = credit | debit | prepaid | other (วิธีการชำระ)
 * Card Network = visa | master | jcb | amex | unionpay | truemoney | other (เครือข่ายชำระ)
 *
 * A "Visa Credit Card" = cardAccountType: credit + cardNetwork: visa
 */

export const CARD_ACCOUNT_TYPES = [
  { id: "credit", nameTh: "บัตรเครดิต", nameEn: "Credit" },
  { id: "debit", nameTh: "บัตรเดบิต", nameEn: "Debit" },
  { id: "prepaid", nameTh: "บัตรเติมเงิน", nameEn: "Prepaid" },
  { id: "other", nameTh: "อื่นๆ", nameEn: "Other" },
] as const;

export const CARD_NETWORKS = [
  { id: "visa", nameTh: "วีซ่า", nameEn: "Visa" },
  { id: "master", nameTh: "มาสเตอร์การ์ด", nameEn: "Mastercard" },
  { id: "jcb", nameTh: "เจซีบี", nameEn: "JCB" },
  { id: "amex", nameTh: "อเมริกันเอ็กซ์เพรส", nameEn: "American Express" },
  { id: "unionpay", nameTh: "ยูเนี่ยนเพย์", nameEn: "UnionPay" },
  { id: "truemoney", nameTh: "ทรูมันนี่", nameEn: "TrueMoney" },
  { id: "other", nameTh: "อื่นๆ", nameEn: "Other" },
] as const;

export const CARD_ACCOUNT_TYPE_OTHER = "other" as const;
export const CARD_NETWORK_OTHER = "other" as const;

export type CardAccountTypeId = (typeof CARD_ACCOUNT_TYPES)[number]["id"];
export type CardNetworkId = (typeof CARD_NETWORKS)[number]["id"];

export function getCardAccountTypeDisplayName(
  id: string | null | undefined,
  locale: "th" | "en" = "th"
): string | null {
  if (!id) return null;
  const item = CARD_ACCOUNT_TYPES.find((c) => c.id === id);
  return item ? (locale === "th" ? item.nameTh : item.nameEn) : id;
}

export function getCardNetworkDisplayName(
  id: string | null | undefined,
  locale: "th" | "en" = "th"
): string | null {
  if (!id) return null;
  const item = CARD_NETWORKS.find((c) => c.id === id);
  return item ? (locale === "th" ? item.nameTh : item.nameEn) : id;
}

/**
 * Combines account type and network for display, e.g. "บัตรเครดิต วีซ่า" or "Visa Credit Card"
 */
export function getFullCardTypeDisplayName(
  accountType: string | null | undefined,
  network: string | null | undefined,
  locale: "th" | "en" = "th"
): string | null {
  const accountName = getCardAccountTypeDisplayName(accountType, locale);
  const networkName = getCardNetworkDisplayName(network, locale);
  if (!accountName && !networkName) return null;
  if (accountName && networkName) {
    return locale === "th" ? `${accountName} ${networkName}` : `${networkName} ${accountName}`;
  }
  return accountName ?? networkName;
}
