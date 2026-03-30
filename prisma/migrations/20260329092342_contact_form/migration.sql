-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` VARCHAR(191) NOT NULL,
    `senderEmail` VARCHAR(255) NOT NULL,
    `senderName` VARCHAR(200) NULL,
    `topic` ENUM('GENERAL', 'ACCOUNT_HELP', 'PRODUCT_FEEDBACK', 'PARTNERSHIP_OR_PRESS', 'OTHER') NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `uiLanguage` VARCHAR(10) NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `browserInfo` TEXT NULL,
    `emailSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
