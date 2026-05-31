import { authErrorMessageKey } from "@/lib/auth-error-message";

describe("authErrorMessageKey", () => {
  it("maps known NextAuth codes to specific messages", () => {
    expect(authErrorMessageKey("CredentialsSignin")).toBe(
      "auth.signIn.invalidCredentials",
    );
    expect(authErrorMessageKey("ServerError")).toBe("auth.signIn.serverError");
    expect(authErrorMessageKey("Configuration")).toBe("auth.signIn.serverError");
    expect(authErrorMessageKey("OAuthAccountNotLinked")).toBe(
      "auth.signIn.oauthNotLinked",
    );
    expect(authErrorMessageKey("Default")).toBe("auth.signIn.genericError");
  });

  it("falls back to the generic message for null/empty", () => {
    expect(authErrorMessageKey(null)).toBe("auth.signIn.genericError");
    expect(authErrorMessageKey(undefined)).toBe("auth.signIn.genericError");
    expect(authErrorMessageKey("")).toBe("auth.signIn.genericError");
  });

  it("NEVER returns a raw infrastructure error string — it maps to generic", () => {
    // This is the exact value that leaked into the URL when the DB was down.
    const rawPrisma =
      "pool timeout: failed to retrieve a connection from pool after 10100ms (pool connections: active=0 idle=0 limit=10)";
    expect(authErrorMessageKey(rawPrisma)).toBe("auth.signIn.genericError");

    // A few other shapes of untrusted input also collapse to generic.
    for (const code of [
      "Error: connect ECONNREFUSED 127.0.0.1:3306",
      "P2028",
      "<script>alert(1)</script>",
      "totally-unknown-code",
    ]) {
      expect(authErrorMessageKey(code)).toBe("auth.signIn.genericError");
    }
  });
});
