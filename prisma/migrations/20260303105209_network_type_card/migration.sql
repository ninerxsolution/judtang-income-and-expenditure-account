/*
  Warnings:

  - You are about to drop the column `cardType` on the `FinancialAccount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `FinancialAccount` DROP COLUMN `cardType`,
    ADD COLUMN `cardAccountType` VARCHAR(191) NULL,
    ADD COLUMN `cardNetwork` VARCHAR(191) NULL;
