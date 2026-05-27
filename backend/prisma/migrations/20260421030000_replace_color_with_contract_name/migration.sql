-- AlterTable: color 컬럼 삭제 후 contractName 컬럼 추가
ALTER TABLE "companies" DROP COLUMN "color";
ALTER TABLE "companies" ADD COLUMN "contractName" TEXT;
