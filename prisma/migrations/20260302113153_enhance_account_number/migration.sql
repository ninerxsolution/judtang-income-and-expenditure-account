-- AlterTable
ALTER TABLE `financialaccount` ADD COLUMN `accountNumberMode` VARCHAR(191) NULL,
    MODIFY `accountNumber` TEXT NULL;
