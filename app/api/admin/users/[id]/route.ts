import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { finalizeDeletion } from "@/lib/user-status";
import { parseOriginalEmailFromDeletedPlaceholder } from "@/lib/deleted-email-placeholder";
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

  const roleValid = newRole && ["USER", "ADMIN"].includes(newRole);
  const statusValid =
    newStatus && ["ACTIVE", "SUSPENDED", "DELETED"].includes(newStatus);

  if (!roleValid && !statusValid) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    if (newStatus === "DELETED") {
      if (roleValid) {
        await prisma.user.update({
          where: { id },
          data: { role: newRole },
        });
      }
      await finalizeDeletion(id);
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ user });
    }

    const updateData: {
      role?: UserRole;
      status?: UserStatus;
      suspendedAt?: Date | null;
      email?: string;
      deletedAt?: Date | null;
      deleteAfter?: Date | null;
    } = {};

    if (roleValid) {
      updateData.role = newRole;
    }

    if (statusValid && newStatus !== "DELETED") {
      updateData.status = newStatus;
      if (newStatus === "SUSPENDED") {
        updateData.suspendedAt = new Date();
      } else if (newStatus === "ACTIVE") {
        updateData.suspendedAt = null;
        updateData.deletedAt = null;
        updateData.deleteAfter = null;

        const current = await prisma.user.findUnique({
          where: { id },
          select: { email: true },
        });
        const restored = parseOriginalEmailFromDeletedPlaceholder(
          id,
          current?.email ?? null
        );
        if (restored) {
          const taken = await prisma.user.findFirst({
            where: { email: restored, NOT: { id } },
            select: { id: true },
          });
          if (taken) {
            return NextResponse.json(
              {
                error:
                  "Cannot restore email: another account already uses this address.",
              },
              { status: 409 }
            );
          }
          updateData.email = restored;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

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
