/**
 * Email placeholder when an account is finalized as deleted (frees unique email for re-registration).
 */

export const DELETED_USER_EMAIL_NOEMAIL_MARK = "noemail" as const;

export function buildDeletedUserEmail(
  userId: string,
  originalEmail: string | null
): string {
  if (originalEmail) {
    return `deleted_${userId}_${originalEmail}`;
  }
  return `deleted_${userId}_${DELETED_USER_EMAIL_NOEMAIL_MARK}`;
}

/**
 * If `email` matches {@link buildDeletedUserEmail} for this `userId`, returns the original address.
 */
export function parseOriginalEmailFromDeletedPlaceholder(
  userId: string,
  email: string | null
): string | null {
  if (!email) return null;
  const prefix = `deleted_${userId}_`;
  if (!email.startsWith(prefix)) return null;
  const rest = email.slice(prefix.length);
  if (rest === DELETED_USER_EMAIL_NOEMAIL_MARK) return null;
  return rest;
}
