-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `transferAccountId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Transaction_transferAccountId_idx` ON `Transaction`(`transferAccountId`);

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_transferAccountId_fkey` FOREIGN KEY (`transferAccountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
