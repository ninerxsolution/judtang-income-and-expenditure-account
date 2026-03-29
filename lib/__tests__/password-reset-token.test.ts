import {
  emailFromPasswordResetVerificationIdentifier,
  passwordResetIdentifierForEmail,
} from "../password-reset-token";

describe("passwordResetIdentifierForEmail", () => {
  it("prefixes normalized email", () => {
    expect(passwordResetIdentifierForEmail("u@example.com")).toBe(
      "password_reset:u@example.com"
    );
  });
});

describe("emailFromPasswordResetVerificationIdentifier", () => {
  it("strips password_reset prefix", () => {
    expect(
      emailFromPasswordResetVerificationIdentifier("password_reset:u@x.com")
    ).toBe("u@x.com");
  });

  it("returns null for email_verify tokens", () => {
    expect(
      emailFromPasswordResetVerificationIdentifier("email_verify:u@x.com")
    ).toBeNull();
  });

  it("supports legacy bare-email identifier", () => {
    expect(emailFromPasswordResetVerificationIdentifier("legacy@x.com")).toBe(
      "legacy@x.com"
    );
  });
});
