-- AlterTable
ALTER TABLE `FinancialAccount` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'THB';

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `baseAmount` DECIMAL(15, 2) NULL,
    ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'THB',
    ADD COLUMN `exchangeRate` DECIMAL(18, 8) NOT NULL DEFAULT 1,
    ADD COLUMN `transferGroupId` VARCHAR(191) NULL,
    ADD COLUMN `transferLeg` VARCHAR(3) NULL;

-- CreateIndex
CREATE INDEX `Transaction_transferGroupId_idx` ON `Transaction`(`transferGroupId`);
