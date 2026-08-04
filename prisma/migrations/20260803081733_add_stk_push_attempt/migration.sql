-- CreateEnum
CREATE TYPE "StkAttemptStatus" AS ENUM ('ATTEMPTED', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "StkPushAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "amount" DECIMAL(12,2),
    "checkoutRequestId" TEXT,
    "status" "StkAttemptStatus" NOT NULL DEFAULT 'ATTEMPTED',
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StkPushAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StkPushAttempt_jobId_key" ON "StkPushAttempt"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "StkPushAttempt_checkoutRequestId_key" ON "StkPushAttempt"("checkoutRequestId");
