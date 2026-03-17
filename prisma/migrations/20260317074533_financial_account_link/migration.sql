-- AlterTable
ALTER TABLE `FinancialAccount` ADD COLUMN `linkedAccountId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `FinancialAccount` ADD CONSTRAINT `FinancialAccount_linkedAccountId_fkey` FOREIGN KEY (`linkedAccountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
