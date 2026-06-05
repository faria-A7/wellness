CREATE TABLE "AiInsight" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "rangeLabel" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiInsight_userId_createdAt_idx" ON "AiInsight"("userId", "createdAt");
