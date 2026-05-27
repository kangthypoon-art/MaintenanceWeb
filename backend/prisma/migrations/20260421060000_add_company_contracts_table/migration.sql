-- companies 테이블에서 contractName, inspectionLocation 컬럼 제거
ALTER TABLE "companies" DROP COLUMN IF EXISTS "contractName";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "inspectionLocation";

-- company_contracts 테이블 신규 생성
CREATE TABLE "company_contracts" (
  "id"                 SERIAL        NOT NULL,
  "code"               TEXT          NOT NULL,
  "seq"                INTEGER       NOT NULL,
  "contractName"       TEXT          NOT NULL,
  "inspectionLocation" TEXT,
  "createdAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_contracts_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "company_contracts_code_seq_key" UNIQUE ("code", "seq"),
  CONSTRAINT "company_contracts_code_fkey"    FOREIGN KEY ("code")
    REFERENCES "companies"("code") ON DELETE CASCADE ON UPDATE CASCADE
);
