-- AlterTable: add recurringTransactionId to Transaction
ALTER TABLE `Transaction` ADD COLUMN `recurringTransactionId` VARCHAR(191) NULL;

-- CreateIndex on Transaction
CREATE INDEX `Transaction_recurringTransactionId_idx` ON `Transaction`(`recurringTransactionId`);

-- CreateTable
CREATE TABLE `RecurringTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'PAYMENT', 'INTEREST', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `financialAccountId` VARCHAR(191) NULL,
    `frequency` ENUM('WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL,
    `dayOfMonth` INTEGER NULL,
    `monthOfYear` INTEGER NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RecurringTransaction_userId_idx`(`userId`),
    INDEX `RecurringTransaction_financialAccountId_idx`(`financialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RecurringTransaction` ADD CONSTRAINT `RecurringTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringTransaction` ADD CONSTRAINT `RecurringTransaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringTransaction` ADD CONSTRAINT `RecurringTransaction_financialAccountId_fkey` FOREIGN KEY (`financialAccountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_recurringTransactionId_fkey` FOREIGN KEY (`recurringTransactionId`) REFERENCES `RecurringTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
