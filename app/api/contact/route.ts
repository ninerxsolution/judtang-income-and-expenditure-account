/**
 * POST /api/contact — public contact form (no auth).
 * Persists ContactMessage, notifies PUBLIC_CONTACT_TO when configured.
 */
import { NextResponse } from "next/server";
import type { ContactTopic } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendContactNotificationEmail } from "@/lib/email";
import { buildAdminContactMessageDetailUrl } from "@/lib/email-config";
import { coalesceEmailLanguage } from "@/lib/email-i18n";
import {
  verifyTurnstileToken,
  shouldSkipTurnstileVerification,
} from "@/lib/turnstile";
import {
  checkContactRateLimit,
  incrementContactRateLimit,
} from "@/lib/contact-rate-limit";
import {
  normalizeEmail,
  isValidEmailFormat,
  EMAIL_MAX_LENGTH,
} from "@/lib/validation";

const TOPICS: ContactTopic[] = [
  "GENERAL",
  "ACCOUNT_HELP",
  "PRODUCT_FEEDBACK",
  "PARTNERSHIP_OR_PRESS",
  "OTHER",
];
const SUBJECT_MIN = 5;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;
const NAME_MAX = 200;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

function getBrowserInfo(request: Request): string | null {
  return request.headers.get("user-agent") || null;
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const { allowed } = checkContactRateLimit(clientIp);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: {
    email?: unknown;
    name?: unknown;
    topic?: unknown;
    subject?: unknown;
    message?: unknown;
    language?: unknown;
    turnstileToken?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!shouldSkipTurnstileVerification(request)) {
    const token = body.turnstileToken;
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification required" },
        { status: 400 }
      );
    }
    const result = await verifyTurnstileToken(token, clientIp || null);
    if (!result.success) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }
  }

  const emailRaw = body.email;
  if (!emailRaw || typeof emailRaw !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const normalizedEmail = normalizeEmail(emailRaw);
  if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (normalizedEmail.length > EMAIL_MAX_LENGTH) {
    return NextResponse.json({ error: "Email is too long" }, { status: 400 });
  }

  const topic = body.topic;
  if (!topic || typeof topic !== "string" || !TOPICS.includes(topic as ContactTopic)) {
    return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
  }

  const subjectStr =
    typeof body.subject === "string" ? body.subject.trim() : "";
  if (
    subjectStr.length < SUBJECT_MIN ||
    subjectStr.length > SUBJECT_MAX
  ) {
    return NextResponse.json(
      { error: `Subject must be ${SUBJECT_MIN}-${SUBJECT_MAX} characters` },
      { status: 400 }
    );
  }

  const messageStr =
    typeof body.message === "string" ? body.message.trim() : "";
  if (
    messageStr.length < MESSAGE_MIN ||
    messageStr.length > MESSAGE_MAX
  ) {
    return NextResponse.json(
      { error: `Message must be ${MESSAGE_MIN}-${MESSAGE_MAX} characters` },
      { status: 400 }
    );
  }

  let nameStr: string | null = null;
  if (body.name != null) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    const t = body.name.trim();
    if (t.length > NAME_MAX) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    nameStr = t.length > 0 ? t : null;
  }

  const uiLanguage = coalesceEmailLanguage(body.language);
  const uiLangCode = uiLanguage === "en" ? "en" : "th";

  const record = await prisma.contactMessage.create({
    data: {
      senderEmail: normalizedEmail,
      senderName: nameStr,
      topic: topic as ContactTopic,
      subject: subjectStr,
      message: messageStr,
      uiLanguage: uiLangCode,
      ipAddress: clientIp ? clientIp.slice(0, 45) : null,
      browserInfo: getBrowserInfo(request),
    },
  });

  incrementContactRateLimit(clientIp);

  const contactTo = process.env.PUBLIC_CONTACT_TO?.trim();
  if (contactTo) {
    const adminUrl = buildAdminContactMessageDetailUrl(record.id);
    try {
      await sendContactNotificationEmail(
        contactTo,
        {
          id: record.id,
          topic: record.topic,
          senderName: record.senderName,
          senderEmail: record.senderEmail,
          subject: record.subject,
          message: record.message,
          uiLanguage: record.uiLanguage,
          submittedAtIso: record.createdAt.toISOString(),
        },
        adminUrl,
        normalizedEmail
      );
      await prisma.contactMessage.update({
        where: { id: record.id },
        data: { emailSentAt: new Date() },
      });
    } catch (e) {
      console.error("[contact] Failed to send notification email:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    id: record.id,
    message: "Thank you. Your message has been received.",
  });
}
