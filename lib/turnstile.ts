/**
 * Whether to skip Turnstile verification (e.g. localhost, development).
 * Use this so Turnstile is not required when the widget cannot connect locally.
 */
export function shouldSkipTurnstileVerification(request?: Request): boolean {
  if (!process.env.CLOUDFLARE_TURNSTILE_SECRETKEY) return true;
  if (process.env.APP_ENV === "development") return true;
  if (
    process.env.NEXTAUTH_URL?.includes("localhost") ||
    process.env.NEXTAUTH_URL?.includes("127.0.0.1")
  ) {
    return true;
  }
  if (request) {
    const host =
      request.headers.get("host") ??
      request.headers.get("x-forwarded-host") ??
      "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) return true;
  }
  return false;
}

/**
 * Server-side Cloudflare Turnstile verification.
 * Skips verification when CLOUDFLARE_TURNSTILE_SECRETKEY is empty (e.g. local dev).
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string | null
): Promise<{ success: boolean; errorCodes?: string[] }> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRETKEY;
  if (!secret) {
    return { success: true };
  }

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  const data = (await res.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };
  return {
    success: !!data.success,
    errorCodes: data["error-codes"],
  };
}
