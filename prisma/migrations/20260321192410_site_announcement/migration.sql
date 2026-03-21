-- CreateTable
CREATE TABLE `SiteAnnouncement` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `keySlug` VARCHAR(191) NOT NULL DEFAULT 'default',
    `titleTh` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `contentTh` TEXT NULL,
    `contentEn` TEXT NULL,
    `image` VARCHAR(191) NOT NULL,
    `imageAltTh` VARCHAR(191) NULL,
    `imageAltEn` VARCHAR(191) NULL,
    `startAt` DATE NULL,
    `endAt` DATE NULL,
    `showOnce` BOOLEAN NOT NULL DEFAULT false,
    `dismissible` BOOLEAN NOT NULL DEFAULT true,
    `actionUrl` TEXT NULL,
    `actionLabelTh` VARCHAR(191) NULL,
    `actionLabelEn` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
