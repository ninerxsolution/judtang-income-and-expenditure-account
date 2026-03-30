/**
 * Transactional email copy by UI language (th / en).
 */
import { translate, DEFAULT_LANGUAGE, type Language } from "@/i18n";
import { isSupportedLanguage } from "@/i18n/config";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function coalesceEmailLanguage(value: unknown): Language {
  if (typeof value === "string" && isSupportedLanguage(value)) {
    return value;
  }
  return DEFAULT_LANGUAGE;
}

export function buildVerificationEmail(
  lang: Language,
  verifyUrl: string
): { subject: string; html: string } {
  const subject = translate(lang, "email.verification.subject");
  const html = `
      <p>${escapeHtml(translate(lang, "email.verification.line1"))}</p>
      <p>${escapeHtml(translate(lang, "email.verification.line2"))}</p>
      <p><a href="${escapeAttr(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>
      <p>${escapeHtml(translate(lang, "email.verification.lineExpiry"))}</p>
    `.trim();
  return { subject, html };
}

export function buildPasswordResetEmail(
  lang: Language,
  resetUrl: string
): { subject: string; html: string } {
  const subject = translate(lang, "email.passwordReset.subject");
  const html = `
      <p>${escapeHtml(translate(lang, "email.passwordReset.line1"))}</p>
      <p>${escapeHtml(translate(lang, "email.passwordReset.line2"))}</p>
      <p><a href="${escapeAttr(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
      <p>${escapeHtml(translate(lang, "email.passwordReset.lineExpiry"))}</p>
    `.trim();
  return { subject, html };
}

export function buildReportNotificationEmail(
  lang: Language,
  report: {
    category: string;
    title: string;
    userEmail: string;
    description: string;
  },
  adminDetailUrl: string
): { subject: string; html: string } {
  const subject = translate(lang, "email.report.subject", {
    category: report.category,
    title: report.title,
  });
  const descTruncated =
    report.description.length > 500
      ? report.description.slice(0, 500) + "..."
      : report.description;
  const escapedDesc = escapeHtml(descTruncated);
  const html = `
      <p>${escapeHtml(translate(lang, "email.report.intro"))}</p>
      <dl>
        <dt>${escapeHtml(translate(lang, "email.report.labelCategory"))}</dt>
        <dd>${escapeHtml(report.category)}</dd>
        <dt>${escapeHtml(translate(lang, "email.report.labelTitle"))}</dt>
        <dd>${escapeHtml(report.title)}</dd>
        <dt>${escapeHtml(translate(lang, "email.report.labelUser"))}</dt>
        <dd>${escapeHtml(report.userEmail)}</dd>
        <dt>${escapeHtml(translate(lang, "email.report.labelDescription"))}</dt>
        <dd><pre style="white-space:pre-wrap;font-family:inherit;">${escapedDesc}</pre></dd>
      </dl>
      <p><a href="${escapeAttr(adminDetailUrl)}">${escapeHtml(translate(lang, "email.report.viewAdmin"))}</a></p>
    `.trim();
  return { subject, html };
}

function topicLabel(lang: Language, topic: string): string {
  const key = `email.contact.topics.${topic}`;
  const v = translate(lang, key);
  return v === key ? topic : v;
}

function contactFieldsBlock(
  lang: Language,
  data: {
    topic: string;
    senderName: string | null;
    senderEmail: string;
    subject: string;
    message: string;
    uiLanguage: string;
    submittedAtDisplay: string;
  }
): string {
  const msgTruncated =
    data.message.length > 8000
      ? data.message.slice(0, 8000) + "..."
      : data.message;
  const nameDisplay = data.senderName?.trim() || "—";
  const sectionKey =
    lang === "th" ? "email.contact.sectionTh" : "email.contact.sectionEn";
  return `
      <h3 style="margin-top:1rem;">${escapeHtml(translate(lang, sectionKey))}</h3>
      <dl>
        <dt>${escapeHtml(translate(lang, "email.contact.labelTopic"))}</dt>
        <dd>${escapeHtml(topicLabel(lang, data.topic))}</dd>
        <dt>${escapeHtml(translate(lang, "email.contact.labelName"))}</dt>
        <dd>${escapeHtml(nameDisplay)}</dd>
        <dt>${escapeHtml(translate(lang, "email.contact.labelEmail"))}</dt>
        <dd>${escapeHtml(data.senderEmail)}</dd>
        <dt>${escapeHtml(translate(lang, "email.contact.labelSubject"))}</dt>
        <dd>${escapeHtml(data.subject)}</dd>
        <dt>${escapeHtml(translate(lang, "email.contact.labelMessage"))}</dt>
        <dd><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(msgTruncated)}</pre></dd>
        <dt>${escapeHtml(translate(lang, "email.contact.labelUiLanguage"))}</dt>
        <dd>${escapeHtml(data.uiLanguage)}</dd>
        <dt>${escapeHtml(translate(lang, "email.contact.labelSubmittedAt"))}</dt>
        <dd>${escapeHtml(data.submittedAtDisplay)}</dd>
      </dl>
    `.trim();
}

export function buildContactNotificationEmail(
  data: {
    topic: string;
    senderName: string | null;
    senderEmail: string;
    subject: string;
    message: string;
    uiLanguage: string;
    submittedAtIso: string;
  },
  adminDetailUrl: string
): { subject: string; html: string } {
  const subject = `${translate("th", "email.contact.subjectPrefix")}: ${data.subject} / ${translate("en", "email.contact.subjectPrefix")}: ${data.subject}`;
  const submittedAtDisplay = data.submittedAtIso;
  const thBlock = contactFieldsBlock("th", { ...data, submittedAtDisplay });
  const enBlock = contactFieldsBlock("en", { ...data, submittedAtDisplay });
  const html = `
      <p>${escapeHtml(translate("th", "email.contact.intro"))}</p>
      ${thBlock}
      <hr style="margin:1.5rem 0;border:none;border-top:1px solid #ccc;" />
      ${enBlock}
      <p style="margin-top:1rem;"><a href="${escapeAttr(adminDetailUrl)}">${escapeHtml(translate("th", "email.contact.viewAdmin"))}</a></p>
    `.trim();
  return { subject, html };
}
