/**
 * User account lifecycle: status resolution and deletion finalization.
 * No cron jobs; effective status derived from timestamps during system operations.
 */
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

export type ResolvedUserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type UserWithStatus = {
  status: string;
  deleteAfter: Date | null;
};

export function getGracePeriodDays(): number {
  const val = process.env.ACCOUNT_GRACE_PERIOD_DAYS;
  if (val != null) {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 30;
}

/**
 * Resolves effective user status. If status is SUSPENDED and now > deleteAfter,
 * returns DELETED (logically deleted).
 */
export function resolveUserStatus(
  user: UserWithStatus
): ResolvedUserStatus {
  if (user.status === "SUSPENDED" && user.deleteAfter) {
    if (new Date() > user.deleteAfter) {
      return "DELETED";
    }
  }
  return user.status as ResolvedUserStatus;
}

/**
 * Finalizes deletion: updates User (status=DELETED, deletedAt, mutate email),
 * revokes all UserSessions. Must be called within a transaction context or
 * the caller ensures atomicity.
 */
export async function finalizeDeletion(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, status: true },
  });
  if (!user) return;
  if (user.status === "DELETED") return; // already finalized

  const mutatedEmail = user.email
    ? `deleted_${userId}_${user.email}`
    : `deleted_${userId}_noemail`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        email: mutatedEmail,
        suspendedAt: null,
        deleteAfter: null,
      },
    }),
    prisma.userSession.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    }),
  ]);

  void createActivityLog({
    userId,
    action: ActivityLogAction.ACCOUNT_DELETED,
    entityType: "USER",
    entityId: userId,
  });
}
