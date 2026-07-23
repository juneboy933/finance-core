-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'AMOUNT_MISMATCH', 'MISSING_IN_LEDGER', 'MISSING_IN_STATEMENT');

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "mpesaReceiptNumber" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "ledgerAmount" DECIMAL(12,2),
    "statementAmount" DECIMAL(12,2),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);
