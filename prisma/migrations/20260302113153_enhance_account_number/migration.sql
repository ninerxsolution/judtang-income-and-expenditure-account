-- AlterTable
ALTER TABLE `FinancialAccount` ADD COLUMN `accountNumberMode` VARCHAR(191) NULL,
    MODIFY `accountNumber` TEXT NULL;
