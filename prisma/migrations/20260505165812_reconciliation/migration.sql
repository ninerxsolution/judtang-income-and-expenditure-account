-- CreateTable
CREATE TABLE `BalanceReconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `financialAccountId` VARCHAR(191) NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appBalance` DECIMAL(15, 2) NOT NULL,
    `statedBalance` DECIMAL(15, 2) NOT NULL,
    `difference` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BalanceReconciliation_financialAccountId_checkedAt_idx`(`financialAccountId`, `checkedAt`),
    INDEX `BalanceReconciliation_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BalanceReconciliation` ADD CONSTRAINT `BalanceReconciliation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BalanceReconciliation` ADD CONSTRAINT `BalanceReconciliation_financialAccountId_fkey` FOREIGN KEY (`financialAccountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
