-- CreateEnum
CREATE TYPE "Role" AS ENUM ('creator', 'brand');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('importing', 'draft', 'live');

-- CreateEnum
CREATE TYPE "DataState" AS ENUM ('pending', 'partial', 'complete');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('unverified', 'verified');

-- CreateEnum
CREATE TYPE "ImportTier" AS ENUM ('cache', 'live', 'manual');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('reading', 'ok', 'timeout', 'failed');

-- CreateEnum
CREATE TYPE "MetaFreshness" AS ENUM ('live', 'cached', 'stale');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('offered', 'countered', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('accepted', 'drafting', 'in_review', 'approved', 'posted', 'measuring', 'completed', 'paid');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('wallet_topup', 'booking_hold', 'booking_charge', 'creator_earning', 'payout');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('scheduled', 'paid');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "valueProposition" TEXT,
    "icps" JSONB NOT NULL DEFAULT '[]',
    "autoRespond" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "urlSlug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "headline" TEXT,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "industries" TEXT[],
    "pricePerPostCents" INTEGER NOT NULL,
    "medianViews" INTEGER,
    "cardStatus" "CardStatus" NOT NULL DEFAULT 'importing',
    "dataState" "DataState" NOT NULL DEFAULT 'pending',
    "verificationState" "VerificationState" NOT NULL DEFAULT 'unverified',
    "taxProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "autoRespond" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_imports" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "urlSlug" TEXT NOT NULL,
    "tier" "ImportTier" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'reading',
    "freshness" "MetaFreshness",
    "rawPayload" JSONB,
    "fieldsUsed" TEXT[] DEFAULT ARRAY['name', 'photo', 'headline', 'country', 'followerCount']::TEXT[],
    "errorMessage" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "postCount" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "briefProduct" TEXT NOT NULL,
    "briefAudience" TEXT NOT NULL,
    "briefGuardrail" TEXT NOT NULL DEFAULT 'Creators can adapt the angle to their expertise, while keeping every product claim factual.',
    "channel" TEXT NOT NULL DEFAULT 'linkedin',
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "postDeadlineDays" INTEGER NOT NULL DEFAULT 14,
    "budgetCapCents" INTEGER,
    "status" "CampaignStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "listPriceCents" INTEGER NOT NULL,
    "offerPriceCents" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "postBy" TIMESTAMP(3) NOT NULL,
    "workMode" TEXT NOT NULL DEFAULT 'specific_brief',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" "OfferStatus" NOT NULL DEFAULT 'offered',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "counterPriceCents" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "note" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "offerId" TEXT,
    "applicationId" TEXT,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "agreedPriceCents" INTEGER NOT NULL,
    "postBy" TIMESTAMP(3) NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" "BookingStatus" NOT NULL DEFAULT 'accepted',
    "draftContent" TEXT,
    "postUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "selfReportedViews" INTEGER,
    "trackingCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "uaFamily" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pipelineValueCents" INTEGER NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "bookingId" TEXT,
    "direction" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'scheduled',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brands_accountId_key" ON "brands"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "creators_accountId_key" ON "creators"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "creators_linkedinUrl_key" ON "creators"("linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "creators_urlSlug_key" ON "creators"("urlSlug");

-- CreateIndex
CREATE INDEX "creators_cardStatus_idx" ON "creators"("cardStatus");

-- CreateIndex
CREATE INDEX "profile_imports_urlSlug_idx" ON "profile_imports"("urlSlug");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "offers_creatorId_status_idx" ON "offers"("creatorId", "status");

-- CreateIndex
CREATE INDEX "offers_campaignId_idx" ON "offers"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_campaignId_creatorId_key" ON "applications"("campaignId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_offerId_key" ON "bookings"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_applicationId_key" ON "bookings"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_trackingCode_key" ON "bookings"("trackingCode");

-- CreateIndex
CREATE INDEX "bookings_creatorId_status_idx" ON "bookings"("creatorId", "status");

-- CreateIndex
CREATE INDEX "bookings_brandId_status_idx" ON "bookings"("brandId", "status");

-- CreateIndex
CREATE INDEX "click_events_bookingId_idx" ON "click_events"("bookingId");

-- CreateIndex
CREATE INDEX "leads_bookingId_idx" ON "leads"("bookingId");

-- CreateIndex
CREATE INDEX "leads_campaignId_idx" ON "leads"("campaignId");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_idx" ON "ledger_entries"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_bookingId_key" ON "payouts"("bookingId");

-- CreateIndex
CREATE INDEX "payouts_creatorId_status_idx" ON "payouts"("creatorId", "status");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creators" ADD CONSTRAINT "creators_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_imports" ADD CONSTRAINT "profile_imports_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
