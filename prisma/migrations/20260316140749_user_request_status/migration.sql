-- AlterTable
ALTER TABLE `user` ADD COLUMN `deleteAfter` DATETIME(3) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `suspendedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `UserDeletionRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleteAfter` DATETIME(3) NOT NULL,
    `cancelledAt` DATETIME(3) NULL,

    INDEX `UserDeletionRequest_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserDeletionRequest` ADD CONSTRAINT `UserDeletionRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
