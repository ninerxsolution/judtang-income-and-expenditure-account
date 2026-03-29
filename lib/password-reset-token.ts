/**
 * VerificationToken.identifier for password reset (distinct from email_verify:* and NextAuth).
 */
export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password_reset:" as const;

export function passwordResetIdentifierForEmail(normalizedEmail: string): string {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${normalizedEmail}`;
}

/**
 * Resolves login email from a VerificationToken row for password reset.
 * Returns null if the row is not a password-reset token (e.g. email verification).
 */
export function emailFromPasswordResetVerificationIdentifier(
  identifier: string
): string | null {
  if (identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)) {
    return identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length);
  }
  if (identifier.startsWith("email_verify:")) {
    return null;
  }
  return identifier;
}
