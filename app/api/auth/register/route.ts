/**
 * POST /api/auth/register — create a user (Credentials).
 * Body: { email: string, password: string, name?: string }
 * Email is normalized (trim, lowercase); validated for format and length. Password validated for min/max length.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  isValidEmailFormat,
  EMAIL_MAX_LENGTH,
  validatePasswordLength,
} from "@/lib/validation";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(String(email));
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "email and password required" },
        { status: 400 }
      );
    }
    if (!isValidEmailFormat(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    if (normalizedEmail.length > EMAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: "Email is too long" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordLength(String(password));
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name != null && String(name).trim() !== "" ? String(name).trim() : null,
        password: hashedPassword,
      },
    });
    void createActivityLog({
      userId: user.id,
      action: ActivityLogAction.USER_REGISTERED,
      entityType: "user",
      entityId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
