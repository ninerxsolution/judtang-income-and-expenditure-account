/**
 * Email sending via SMTP (e.g. Gmail). Used for password reset.
 */
import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT) ?? 587;
const secure = process.env.SMTP_PORT === "465";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Sends a password reset email with the given reset URL.
 * @throws If SMTP send fails
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const from = process.env.SMTP_USER ?? "noreply@example.com";
  await transporter.sendMail({
    from,
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `.trim(),
  });
}
