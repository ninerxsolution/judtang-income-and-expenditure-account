/**
 * Shared validation for auth: email (format, length, normalize) and password (min/max length).
 */

export const EMAIL_MAX_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_NAME_LENGTH = 100;

// Transaction
export const MAX_CATEGORY_LENGTH = 100;
export const MAX_NOTE_LENGTH = 2000;

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT.test(email);
}

export function validatePasswordLength(password: string): { ok: boolean; error?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
  return { ok: true };
}
