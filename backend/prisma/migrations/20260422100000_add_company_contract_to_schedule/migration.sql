ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "companyContractId" INTEGER;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_companyContractId_fkey"
  FOREIGN KEY ("companyContractId") REFERENCES "company_contracts"("id") ON DELETE SET NULL;
