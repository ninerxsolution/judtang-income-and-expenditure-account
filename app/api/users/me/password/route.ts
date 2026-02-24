/**
 * PATCH: change password (body: { currentPassword, newPassword }).
 * Only for users with a password (Credentials); OAuth-only users get 400.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validatePasswordLength } from "@/lib/validation";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function PATCH(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "currentPassword and newPassword required" },
      { status: 400 }
    );
  }

  const passwordCheck = validatePasswordLength(newPassword);
  if (!passwordCheck.ok) {
    return NextResponse.json(
      { error: passwordCheck.error },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user?.password) {
    return NextResponse.json(
      { error: "Account has no password (e.g. signed in with Google)" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  void createActivityLog({
    userId,
    action: ActivityLogAction.USER_PASSWORD_CHANGED,
    entityType: "user",
    entityId: userId,
  });

  return NextResponse.json({ ok: true });
}
