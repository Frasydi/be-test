/*
  Warnings:

  - You are about to alter the column `fullName` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `email` VARCHAR(254) NOT NULL,
    MODIFY `password` VARCHAR(255) NOT NULL,
    MODIFY `fullName` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `User_email_idx` ON `User`(`email`);

-- CreateIndex
CREATE INDEX `User_createdAt_idx` ON `User`(`createdAt`);
