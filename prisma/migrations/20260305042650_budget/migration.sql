-- CreateTable
CREATE TABLE `BudgetTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `totalBudget` DECIMAL(15, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BudgetTemplate_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetTemplateCategory` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `limitAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BudgetTemplateCategory_templateId_idx`(`templateId`),
    INDEX `BudgetTemplateCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `BudgetTemplateCategory_templateId_categoryId_key`(`templateId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetMonth` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `totalBudget` DECIMAL(15, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BudgetMonth_userId_year_month_idx`(`userId`, `year`, `month`),
    UNIQUE INDEX `BudgetMonth_userId_year_month_key`(`userId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetCategory` (
    `id` VARCHAR(191) NOT NULL,
    `budgetMonthId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `limitAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BudgetCategory_budgetMonthId_idx`(`budgetMonthId`),
    INDEX `BudgetCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `BudgetCategory_budgetMonthId_categoryId_key`(`budgetMonthId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BudgetTemplate` ADD CONSTRAINT `BudgetTemplate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetTemplateCategory` ADD CONSTRAINT `BudgetTemplateCategory_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `BudgetTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetTemplateCategory` ADD CONSTRAINT `BudgetTemplateCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetMonth` ADD CONSTRAINT `BudgetMonth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetCategory` ADD CONSTRAINT `BudgetCategory_budgetMonthId_fkey` FOREIGN KEY (`budgetMonthId`) REFERENCES `BudgetMonth`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetCategory` ADD CONSTRAINT `BudgetCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
