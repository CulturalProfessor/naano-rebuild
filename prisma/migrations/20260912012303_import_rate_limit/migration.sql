-- AlterTable
ALTER TABLE "profile_imports" ADD COLUMN     "ipHash" TEXT;

-- CreateIndex
CREATE INDEX "profile_imports_ipHash_fetchedAt_idx" ON "profile_imports"("ipHash", "fetchedAt");
