/**
 * Transactional email: Resend API when RESEND_API_KEY is set, else Nodemailer (SMTP).
 */
import nodemailer from "nodemailer";
import { Resend } from "resend";

type EmailKind = "auth" | "report";

function resolveFrom(kind: EmailKind): string {
  if (kind === "report") {
    return (
      process.env.EMAIL_REPORT_FROM?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      ""
    );
  }
  return process.env.EMAIL_FROM?.trim() || "";
}

function resolveSmtpFrom(kind: EmailKind): string {
  const configured = resolveFrom(kind);
  if (configured) return configured;
  return process.env.SMTP_USER ?? "noreply@example.com";
}

function getReplyTo(): string | undefined {
  const v = process.env.EMAIL_REPLY_TO?.trim();
  return v || undefined;
}

function createSmtpTransport(): nodemailer.Transporter {
  const portRaw = process.env.SMTP_PORT;
  const port =
    portRaw !== undefined && portRaw !== ""
      ? Number(portRaw)
      : 587;
  const effectivePort = Number.isFinite(port) ? port : 587;
  const secure =
    process.env.SMTP_SECURE === "true" || effectivePort === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: effectivePort,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function sendHtmlEmail(options: {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const replyTo = getReplyTo();

  if (resendKey) {
    const from = resolveFrom(options.kind);
    if (!from) {
      const msg = "[email] RESEND_API_KEY is set but EMAIL_FROM is missing";
      console.error(msg);
      throw new Error(msg);
    }

    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(replyTo ? { replyTo } : {}),
    });

    if (result.error) {
      console.error("[email] Resend send failed:", result.error);
      throw new Error(result.error.message);
    }

    console.info("[email] sent", {
      provider: "resend",
      to: options.to,
      id: result.data?.id,
    });
    return;
  }

  const from = resolveSmtpFrom(options.kind);
  const transport = createSmtpTransport();
  const info = await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    ...(replyTo ? { replyTo } : {}),
  });

  console.info("[email] sent", {
    provider: "smtp",
    to: options.to,
    messageId: info.messageId,
  });
}

/**
 * Sends a password reset email with the given reset URL.
 * @throws If send fails
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await sendHtmlEmail({
    to,
    kind: "auth",
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `.trim(),
  });
}

/**
 * Sends an email verification link.
 * @throws If send fails
 */
export async function sendEmailVerification(
  to: string,
  verifyUrl: string
): Promise<void> {
  await sendHtmlEmail({
    to,
    kind: "auth",
    subject: "Verify your email address",
    html: `
      <p>Thank you for signing up.</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
    `.trim(),
  });
}

type ReportNotificationPayload = {
  id: string;
  category: string;
  title: string;
  userEmail: string;
  description: string;
};

/**
 * Sends a report notification email to admin.
 * @throws If send fails
 */
export async function sendReportNotificationEmail(
  to: string,
  report: ReportNotificationPayload,
  adminDetailUrl: string
): Promise<void> {
  const descTruncated =
    report.description.length > 500
      ? report.description.slice(0, 500) + "..."
      : report.description;
  const escapedDesc = descTruncated
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  await sendHtmlEmail({
    to,
    kind: "report",
    subject: `[Report] ${report.category}: ${report.title}`,
    html: `
      <p>A new report has been submitted.</p>
      <dl>
        <dt>Category</dt>
        <dd>${report.category}</dd>
        <dt>Title</dt>
        <dd>${report.title}</dd>
        <dt>User</dt>
        <dd>${report.userEmail}</dd>
        <dt>Description</dt>
        <dd><pre style="white-space:pre-wrap;font-family:inherit;">${escapedDesc}</pre></dd>
      </dl>
      <p><a href="${adminDetailUrl}">View in Admin</a></p>
    `.trim(),
  });
}
