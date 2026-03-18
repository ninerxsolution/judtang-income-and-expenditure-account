import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole, UserStatus } from "@prisma/client";

type SessionWithId = {
  user: { id?: string; role?: string };
  sessionId?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const { role: newRole, status: newStatus } = body as {
    role?: UserRole;
    status?: UserStatus;
  };

  const updateData: { role?: UserRole; status?: UserStatus; suspendedAt?: Date | null } = {};

  if (newRole && ["USER", "ADMIN"].includes(newRole)) {
    updateData.role = newRole;
  }

  if (newStatus && ["ACTIVE", "SUSPENDED", "DELETED"].includes(newStatus)) {
    updateData.status = newStatus;
    if (newStatus === "SUSPENDED") {
      updateData.suspendedAt = new Date();
    } else if (newStatus === "ACTIVE") {
      updateData.suspendedAt = null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
