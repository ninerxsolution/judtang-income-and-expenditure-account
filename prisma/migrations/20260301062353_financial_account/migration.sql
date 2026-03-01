/*
  Warnings:

  - You are about to alter the column `type` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(15,2)`.

*/
-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `financialAccountId` VARCHAR(191) NULL,
    ADD COLUMN `postedDate` DATETIME(3) NULL,
    ADD COLUMN `statementId` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'POSTED', 'VOID') NOT NULL DEFAULT 'POSTED',
    MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'PAYMENT', 'INTEREST', 'ADJUSTMENT') NOT NULL,
    MODIFY `amount` DECIMAL(15, 2) NOT NULL;

-- CreateTable
CREATE TABLE `FinancialAccount` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('BANK', 'CREDIT_CARD', 'WALLET', 'CASH', 'OTHER') NOT NULL,
    `initialBalance` DECIMAL(15, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `lastCheckedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `creditLimit` DECIMAL(15, 2) NULL,
    `statementClosingDay` INTEGER NULL,
    `dueDay` INTEGER NULL,
    `currentOutstanding` DECIMAL(15, 2) NULL,
    `availableCredit` DECIMAL(15, 2) NULL,
    `interestRate` DECIMAL(8, 4) NULL,
    `interestCalculatedUntil` DATETIME(3) NULL,
    `cardType` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,

    INDEX `FinancialAccount_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    INDEX `Category_userId_idx`(`userId`),
    UNIQUE INDEX `Category_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditCardStatement` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `closingDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `statementBalance` DECIMAL(15, 2) NOT NULL,
    `minimumPayment` DECIMAL(15, 2) NOT NULL,
    `paidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `isClosed` BOOLEAN NOT NULL DEFAULT false,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditCardStatement_accountId_idx`(`accountId`),
    INDEX `CreditCardStatement_accountId_closingDate_idx`(`accountId`, `closingDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Transaction_financialAccountId_idx` ON `Transaction`(`financialAccountId`);

-- CreateIndex
CREATE INDEX `Transaction_statementId_idx` ON `Transaction`(`statementId`);

-- AddForeignKey
ALTER TABLE `FinancialAccount` ADD CONSTRAINT `FinancialAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_financialAccountId_fkey` FOREIGN KEY (`financialAccountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `CreditCardStatement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditCardStatement` ADD CONSTRAINT `CreditCardStatement_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
