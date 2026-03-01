import { prisma } from "@/lib/prisma";

export const ActivityLogAction = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGGED_IN: "USER_LOGGED_IN",
  USER_LOGGED_OUT: "USER_LOGGED_OUT",
  USER_PROFILE_UPDATED: "USER_PROFILE_UPDATED",
  USER_PASSWORD_CHANGED: "USER_PASSWORD_CHANGED",
  USER_PASSWORD_RESET_REQUESTED: "USER_PASSWORD_RESET_REQUESTED",
  USER_EMAIL_VERIFIED: "USER_EMAIL_VERIFIED",
  SESSION_REVOKED: "SESSION_REVOKED",
  TRANSACTION_CREATED: "TRANSACTION_CREATED",
  TRANSACTION_UPDATED: "TRANSACTION_UPDATED",
  TRANSACTION_DELETED: "TRANSACTION_DELETED",
  TRANSACTION_EXPORT: "TRANSACTION_EXPORT",
  TRANSACTION_IMPORT: "TRANSACTION_IMPORT",
  CREDIT_CARD_PAYMENT: "CREDIT_CARD_PAYMENT",
  FINANCIAL_ACCOUNT_CREATED: "FINANCIAL_ACCOUNT_CREATED",
  FINANCIAL_ACCOUNT_UPDATED: "FINANCIAL_ACCOUNT_UPDATED",
  FINANCIAL_ACCOUNT_DISABLED: "FINANCIAL_ACCOUNT_DISABLED",
  FINANCIAL_ACCOUNT_DELETED: "FINANCIAL_ACCOUNT_DELETED",
  FINANCIAL_ACCOUNT_RESTORED: "FINANCIAL_ACCOUNT_RESTORED",
} as const;

export type ActivityLogActionType = (typeof ActivityLogAction)[keyof typeof ActivityLogAction];

export type CreateActivityLogParams = {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: object;
};

/**
 * Records a business-level event for audit. Does not throw; failures are swallowed
 * so the main request is not broken.
 */
export async function createActivityLog(params: CreateActivityLogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        details: params.details ?? undefined,
      },
    });
  } catch {
    // Do not fail the request if activity log insert fails
  }
}
