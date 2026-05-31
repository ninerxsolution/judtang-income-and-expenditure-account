/**
 * Map a NextAuth error code (the `?error=` query value on the sign-in page) to a
 * friendly, localized i18n key.
 *
 * SECURITY: any code that is not explicitly whitelisted here — including a raw
 * infrastructure error string such as a Prisma "pool timeout: failed to retrieve
 * a connection from pool ..." — falls back to the generic message. Internal error
 * details must never be rendered to the user. See auth.ts (`pages.error`) which
 * routes NextAuth errors to our sign-in page instead of the default page that
 * echoes the raw string.
 */
export type AuthErrorMessageKey =
  | "auth.signIn.invalidCredentials"
  | "auth.signIn.serverError"
  | "auth.signIn.oauthNotLinked"
  | "auth.signIn.genericError";

const GENERIC: AuthErrorMessageKey = "auth.signIn.genericError";

const CODE_TO_KEY: Record<string, AuthErrorMessageKey> = {
  // Bad email/password (also what NextAuth uses for a returned-null authorize).
  CredentialsSignin: "auth.signIn.invalidCredentials",
  // Our sentinel for "infrastructure is down" (DB pool timeout, etc.).
  ServerError: "auth.signIn.serverError",
  // NextAuth's own server-side misconfiguration / callback failure code.
  Configuration: "auth.signIn.serverError",
  // Email already registered with a different provider.
  OAuthAccountNotLinked: "auth.signIn.oauthNotLinked",
  Default: GENERIC,
};

/**
 * Returns the i18n key for a given NextAuth error code. Unknown/raw codes → generic.
 * Pass the value straight from `searchParams.error`.
 */
export function authErrorMessageKey(
  code: string | null | undefined,
): AuthErrorMessageKey {
  if (!code) return GENERIC;
  return CODE_TO_KEY[code] ?? GENERIC;
}
