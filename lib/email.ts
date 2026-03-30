/**
 * Transactional email: Resend API when RESEND_API_KEY is set, else Nodemailer (SMTP).
 */
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { DEFAULT_LANGUAGE, type Language } from "@/i18n";
import {
  buildContactNotificationEmail,
  buildPasswordResetEmail,
  buildReportNotificationEmail as buildReportEmailBody,
  buildVerificationEmail,
} from "@/lib/email-i18n";

type EmailKind = "auth" | "report" | "contact";

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
  /** When set, used instead of EMAIL_REPLY_TO (e.g. public contact submitter). */
  replyTo?: string;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const replyTo = options.replyTo?.trim() || getReplyTo();

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
    ...(replyTo ? { replyTo: replyTo } : {}),
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
  resetUrl: string,
  lang: Language = DEFAULT_LANGUAGE
): Promise<void> {
  const { subject, html } = buildPasswordResetEmail(lang, resetUrl);
  await sendHtmlEmail({
    to,
    kind: "auth",
    subject,
    html,
  });
}

/**
 * Sends an email verification link.
 * @throws If send fails
 */
export async function sendEmailVerification(
  to: string,
  verifyUrl: string,
  lang: Language = DEFAULT_LANGUAGE
): Promise<void> {
  const { subject, html } = buildVerificationEmail(lang, verifyUrl);
  await sendHtmlEmail({
    to,
    kind: "auth",
    subject,
    html,
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
  adminDetailUrl: string,
  lang: Language = DEFAULT_LANGUAGE
): Promise<void> {
  const { subject, html } = buildReportEmailBody(
    lang,
    {
      category: report.category,
      title: report.title,
      userEmail: report.userEmail,
      description: report.description,
    },
    adminDetailUrl
  );
  await sendHtmlEmail({
    to,
    kind: "report",
    subject,
    html,
  });
}

type ContactNotificationPayload = {
  id: string;
  topic: string;
  senderName: string | null;
  senderEmail: string;
  subject: string;
  message: string;
  uiLanguage: string;
  submittedAtIso: string;
};

/**
 * Notifies team inbox about a public contact form submission (Thai + English body).
 * @throws If send fails
 */
export async function sendContactNotificationEmail(
  to: string,
  payload: ContactNotificationPayload,
  adminDetailUrl: string,
  replyToSubmitter: string
): Promise<void> {
  const { subject, html } = buildContactNotificationEmail(
    {
      topic: payload.topic,
      senderName: payload.senderName,
      senderEmail: payload.senderEmail,
      subject: payload.subject,
      message: payload.message,
      uiLanguage: payload.uiLanguage,
      submittedAtIso: payload.submittedAtIso,
    },
    adminDetailUrl
  );
  await sendHtmlEmail({
    to,
    kind: "contact",
    subject,
    html,
    replyTo: replyToSubmitter,
  });
}
