/**
 * Server-only helpers for account number handling (encryption/decryption).
 */

import { decrypt, encrypt, isEncrypted } from "@/lib/encryption";

/**
 * Returns the value suitable for maskAccountNumber (full digits or last 4).
 * For FULL mode: decrypts and returns full number.
 * For LAST_4_ONLY: returns stored last 4.
 */
export function getAccountNumberForMasking(
  accountNumber: string | null | undefined,
  accountNumberMode: string | null | undefined
): string {
  if (!accountNumber || typeof accountNumber !== "string") return "";
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length < 4) return "";

  if (accountNumberMode === "FULL" && isEncrypted(accountNumber)) {
    try {
      const full = decrypt(accountNumber);
      return full.replace(/\D/g, "");
    } catch {
      return digits.slice(-4);
    }
  }

  return digits.length === 4 ? digits : digits.slice(-4);
}

/**
 * Process account number for storage. Returns { accountNumber, accountNumberMode }.
 * - CREDIT_CARD: store last 4 only (plain)
 * - BANK/WALLET FULL: encrypt full number
 * - BANK/WALLET LAST_4_ONLY: store last 4 only (plain)
 */
export function processAccountNumberForStorage(
  rawAccountNumber: string | null | undefined,
  accountNumberMode: string | null | undefined,
  type: string
): { accountNumber: string | null; accountNumberMode: string | null } {
  const digits = (rawAccountNumber ?? "").replace(/\D/g, "");
  if (!digits) return { accountNumber: null, accountNumberMode: null };

  if (type === "CREDIT_CARD") {
    const last4 = digits.slice(-4);
    return last4.length === 4
      ? { accountNumber: last4, accountNumberMode: null }
      : { accountNumber: null, accountNumberMode: null };
  }

  if (type === "BANK" || type === "WALLET") {
    const mode = accountNumberMode === "FULL" ? "FULL" : "LAST_4_ONLY";
    if (mode === "FULL" && digits.length >= 4) {
      try {
        const ciphertext = encrypt(digits);
        return { accountNumber: ciphertext, accountNumberMode: "FULL" };
      } catch {
        const last4 = digits.slice(-4);
        return { accountNumber: last4, accountNumberMode: "LAST_4_ONLY" };
      }
    }
    const last4 = digits.slice(-4);
    return last4.length === 4
      ? { accountNumber: last4, accountNumberMode: "LAST_4_ONLY" }
      : { accountNumber: null, accountNumberMode: null };
  }

  return { accountNumber: null, accountNumberMode: null };
}

/**
 * Returns plain account number for display (e.g. reveal, copy).
 * Returns null if only last 4 is stored.
 */
export function getFullAccountNumber(
  accountNumber: string | null | undefined,
  accountNumberMode: string | null | undefined
): string | null {
  if (!accountNumber || typeof accountNumber !== "string") return null;
  if (accountNumberMode !== "FULL") return null;
  if (!isEncrypted(accountNumber)) return null;
  try {
    return decrypt(accountNumber);
  } catch {
    return null;
  }
}
