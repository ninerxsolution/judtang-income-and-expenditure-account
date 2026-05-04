-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `accountBalanceAfter` DECIMAL(15, 2) NULL,
    ADD COLUMN `transferAccountBalanceAfter` DECIMAL(15, 2) NULL;
