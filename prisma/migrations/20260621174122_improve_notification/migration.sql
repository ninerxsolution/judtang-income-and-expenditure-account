/*
  Warnings:

  - A unique constraint covering the columns `[userId,dedupeKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `notification` ADD COLUMN `dedupeKey` VARCHAR(191) NULL,
    MODIFY `type` ENUM('EVENT_SLIP_DONE', 'EVENT_IMPORT_DONE', 'EVENT_EXPORT_DONE', 'EVENT_CARD_PAYMENT', 'EVENT_CARD_STATEMENT_CLOSED', 'EVENT_CARD_INTEREST_APPLIED', 'EVENT_RECONCILE_MISMATCH', 'EVENT_CROSS_CURRENCY_TRANSFER', 'EVENT_RECURRING_POSTED', 'EVENT_SECURITY_NEW_SIGN_IN', 'EVENT_SECURITY_PASSWORD_CHANGED', 'EVENT_SECURITY_SESSION_REVOKED', 'EVENT_ACCOUNT_DEACTIVATED', 'EVENT_ACCOUNT_STATUS_CHANGED', 'EVENT_REPORT_SUBMITTED', 'EVENT_REPORT_STATUS_CHANGED', 'EVENT_ANNOUNCEMENT', 'ALERT_RECURRING_DUE', 'ALERT_CARD_DUE', 'ALERT_BUDGET', 'ALERT_INCOMPLETE_ACCOUNT', 'ALERT_CREDIT_LIMIT', 'ALERT_NEGATIVE_BALANCE', 'ALERT_NO_BUDGET', 'ALERT_DELETION_PENDING') NOT NULL;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `category` ENUM('TRANSACTION', 'CARD', 'BUDGET', 'ACCOUNT', 'RECURRING', 'SECURITY', 'REPORT', 'ANNOUNCEMENT') NOT NULL,
    `inApp` BOOLEAN NOT NULL DEFAULT true,
    `email` BOOLEAN NOT NULL DEFAULT false,
    `push` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_category_key`(`userId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` TEXT NOT NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PushSubscription_userId_idx`(`userId`),
    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Notification_userId_type_idx` ON `Notification`(`userId`, `type`);

-- CreateIndex
CREATE UNIQUE INDEX `Notification_userId_dedupeKey_key` ON `Notification`(`userId`, `dedupeKey`);

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
