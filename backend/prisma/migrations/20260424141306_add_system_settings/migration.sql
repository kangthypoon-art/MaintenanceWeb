-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_companyContractId_fkey";

-- AlterTable
ALTER TABLE "company_contracts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "system_setting_history" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_setting_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_setting_history_key_idx" ON "system_setting_history"("key");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_companyContractId_fkey" FOREIGN KEY ("companyContractId") REFERENCES "company_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
