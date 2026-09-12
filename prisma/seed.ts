/**
 * Seeds the marketplace so it is populated without a single live call.
 *
 * What this produces, and why each part exists:
 *   - 26 creator cards, so the brand's grid and filters have something to bite
 *     on. Four of them carry no post history, so the dash rule is visible in
 *     the grid and not only during signup.
 *   - 4 brands with open campaigns, so a creator who signed up sixty seconds
 *     ago lands in a studio with something to apply to. (PLAN.md section 6.)
 *   - Auto-responding counterparties on both sides, labelled, so one visitor
 *     can walk the whole loop alone.
 *   - Completed history with clicks, leads, payouts and ledger rows, so no
 *     dashboard is empty on camera.
 *
 * Run: pnpm seed
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  derivePricePerPostCents,
  deriveDisplayName,
  canonicalLinkedinUrl,
} from "../src/lib/pricing";
import { resolveLocation } from "../src/lib/geo";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Every seeded account shares this password. Stated in the README. */
const DEMO_PASSWORD = "naano-demo";

/** The service's ProfileResponse shape, plus the seed-only underscore keys. */
type CachedProfile = {
  profile: {
    public_identifier: string;
    name: string;
    headline: string | null;
    follower_count: number;
    location: string | null;
    images: { profile_picture: string | null } | null;
  };
  _seedMedianViews: number | null;
  _seedIndustries: string[];
  /** Present on profiles kept free so a live signup can claim them. */
  _unclaimed?: boolean;
};

function trackingCode() {
  return randomBytes(5).toString("hex");
}

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("clearing…");
  // Order matters: children first. Accounts cascade to brand/creator.
  await prisma.ledgerEntry.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.clickEvent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.application.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.bundle.deleteMany();
  await prisma.profileImport.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.account.deleteMany();

  // ---------------------------------------------------------------- creators
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "data", "cached-profiles.json"), "utf-8"),
  ) as Record<string, CachedProfile>;

  /** These two answer offers on their own so a lone visitor can finish a loop. */
  const AUTO_RESPOND_CREATORS = new Set(["nina-costa", "luca-ferrari"]);
  /** A couple of creators carry a bundle, to exercise the pill on the card. */
  const BUNDLE_CREATORS = new Set(["tomas-berg", "clara-dubois", "oliver-reid"]);

  const creators: Record<string, { id: string; price: number; medianViews: number | null }> = {};

  for (const [slug, p] of Object.entries(raw)) {
    // Left in the cache with no creator attached, so a signup on camera has a
    // profile to claim that resolves from tier 1 and needs no live call.
    if (p._unclaimed) continue;
    const prof = p.profile;
    const loc = resolveLocation(prof.location);
    const price = derivePricePerPostCents(prof.follower_count);
    const account = await prisma.account.create({
      data: {
        email: `${slug}@demo.naano.test`,
        passwordHash: hash,
        role: "creator",
      },
    });

    const creator = await prisma.creator.create({
      data: {
        accountId: account.id,
        linkedinUrl: canonicalLinkedinUrl(slug),
        urlSlug: slug,
        fullName: prof.name,
        displayName: deriveDisplayName(prof.name),
        avatarUrl: prof.images?.profile_picture ?? null,
        headline: prof.headline,
        country: loc.country,
        countryCode: loc.countryCode,
        followerCount: prof.follower_count,
        industries: p._seedIndustries ?? [],
        pricePerPostCents: price,
        medianViews: p._seedMedianViews,
        cardStatus: "live",
        // No post history means the data bar stays Pending. That is the point.
        dataState: p._seedMedianViews === null ? "pending" : "complete",
        taxProfileComplete: p._seedMedianViews !== null,
        autoRespond: AUTO_RESPOND_CREATORS.has(slug),
      },
    });

    // The card came from a cached read. Record it, because the consent
    // sentence promises a single read and this table is the proof.
    await prisma.profileImport.create({
      data: {
        creatorId: creator.id,
        sourceUrl: canonicalLinkedinUrl(slug),
        urlSlug: slug,
        tier: "cache",
        status: "ok",
        freshness: "cached",
        rawPayload: p as object,
      },
    });

    if (BUNDLE_CREATORS.has(slug)) {
      await prisma.bundle.create({
        data: {
          creatorId: creator.id,
          postCount: 5,
          // Priced so the saving is a round-ish number, as in the recon.
          totalPriceCents: Math.round((price * 5 * 0.85) / 500) * 500,
          isPrimary: true,
        },
      });
    }

    creators[slug] = { id: creator.id, price, medianViews: p._seedMedianViews };
  }
  console.log(`seeded ${Object.keys(creators).length} creators`);

  // ---------------------------------------------------------------- brands
  const brandRows = [
    {
      slug: "orbisearch",
      name: "OrbiSearch",
      website: "https://orbisearch.example",
      autoRespond: true,
      vp: "OrbiSearch is a B2B search and discovery layer that sits on top of your product catalogue and documentation. It answers the questions your buyers actually type, instead of the keywords your marketing team wishes they typed. Teams deploy it in an afternoon and see support deflection within a week.",
      icps: [
        { title: "Head of Growth at B2B SaaS", description: "Leads growth strategy at mid-to-large SaaS companies and needs measurable pipeline, not impressions." },
        { title: "Head of Support at a scaling product company", description: "Owns deflection and CSAT, and is drowning in tickets that the docs already answer." },
        { title: "Developer Experience Lead", description: "Responsible for docs and onboarding for a technical product." },
      ],
      campaign: {
        name: "Main campaign",
        product: "OrbiSearch is a B2B search and discovery layer for product catalogues and documentation. It answers buyer questions in natural language and deflects support tickets the docs already cover.",
        industries: ["SaaS", "B2B", "Developer Tools", "Customer Support"],
        regions: ["Europe", "North America"],
        cap: 150000,
        deadlineDays: 14,
        dealValue: 480000,
      },
    },
    {
      slug: "premium-inboxes",
      name: "Premium Inboxes",
      website: "https://premiuminboxes.example",
      autoRespond: false,
      vp: "Premium Inboxes gives outbound teams deliverability infrastructure that does not get them blacklisted. Dedicated domains, automated warmup, and per-inbox health scoring, so your sequences reach a human instead of a spam folder.",
      icps: [
        { title: "Head of Sales at B2B SaaS", description: "Runs an outbound motion and has watched reply rates fall for two quarters." },
        { title: "RevOps Lead", description: "Owns the tooling stack and gets blamed when deliverability collapses." },
        { title: "Agency owner running outbound for clients", description: "Manages dozens of sending domains and needs them all healthy." },
      ],
      campaign: {
        name: "Main campaign",
        product: "Premium Inboxes is deliverability infrastructure for outbound sales teams: dedicated domains, automated warmup and per-inbox health scoring.",
        industries: ["Sales", "Outreach", "B2B", "CRM"],
        regions: ["Europe", "North America"],
        cap: 100000,
        deadlineDays: 14,
        dealValue: 350000,
      },
    },
    {
      slug: "huxley-hr",
      name: "Huxley HR",
      website: "https://huxleyhr.example",
      autoRespond: false,
      vp: "Huxley HR replaces the applicant tracking system your recruiters work around. Structured interviews, calibrated scorecards and hiring analytics that survive contact with a hiring manager.",
      icps: [
        { title: "Head of Talent at a scaling company", description: "Hiring fast and losing candidates to a slow, inconsistent process." },
        { title: "People Analytics Lead", description: "Needs hiring data that is trustworthy enough to present to the board." },
        { title: "Founder hiring their first 50", description: "No recruiting team yet and no process to inherit." },
      ],
      campaign: {
        name: "Main campaign",
        product: "Huxley HR is an applicant tracking system built around structured interviews and calibrated scorecards, with hiring analytics that hold up to scrutiny.",
        industries: ["HR", "B2B", "SaaS", "EdTech"],
        regions: ["Europe"],
        cap: 90000,
        deadlineDays: 21,
        dealValue: 420000,
      },
    },
    {
      slug: "ledgerloop",
      name: "LedgerLoop",
      website: "https://ledgerloop.example",
      autoRespond: false,
      vp: "LedgerLoop is embedded payments for vertical SaaS. One integration gives your customers payouts, split settlement and compliance, without you becoming a payments company.",
      icps: [
        { title: "Head of Product at vertical SaaS", description: "Wants to add payments as a revenue line without hiring a payments team." },
        { title: "CTO at a marketplace", description: "Needs split settlement and payouts that survive an audit." },
        { title: "Head of Finance at a scaling platform", description: "Owns reconciliation and compliance risk." },
      ],
      campaign: {
        name: "Main campaign",
        product: "LedgerLoop is embedded payments infrastructure for vertical SaaS and marketplaces: payouts, split settlement and compliance behind one integration.",
        industries: ["Fintech", "SaaS", "B2B", "Developer Tools"],
        regions: ["Europe", "North America"],
        cap: 200000,
        deadlineDays: 14,
        dealValue: 520000,
      },
    },
  ];

  const brands: Record<string, { id: string; accountId: string; campaignId: string }> = {};

  for (const b of brandRows) {
    const account = await prisma.account.create({
      data: {
        email: `${b.slug}@demo.naano.test`,
        passwordHash: hash,
        role: "brand",
      },
    });
    const brand = await prisma.brand.create({
      data: {
        accountId: account.id,
        name: b.name,
        slug: b.slug,
        website: b.website,
        valueProposition: b.vp,
        icps: b.icps,
        autoRespond: b.autoRespond,
      },
    });
    const campaign = await prisma.campaign.create({
      data: {
        brandId: brand.id,
        name: b.campaign.name,
        briefProduct: b.campaign.product,
        briefAudience: b.icps.map((i) => i.title).join(" · "),
        industries: b.campaign.industries,
        regions: b.campaign.regions,
        budgetCapCents: b.campaign.cap,
        postDeadlineDays: b.campaign.deadlineDays,
        // The multiplier behind "estimated pipeline". Shown next to every
        // total it feeds, because a euro figure without its assumption is the
        // same sin as an invented impression count.
        assumedDealValueCents: b.campaign.dealValue,
        status: "open",
      },
    });
    // Brands pre-fund a wallet. Play money on a ledger; no Stripe in this build.
    await prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        direction: "credit",
        amountCents: 1_000_000,
        kind: "wallet_topup",
        memo: "Opening balance",
      },
    });
    brands[b.slug] = { id: brand.id, accountId: account.id, campaignId: campaign.id };
  }
  console.log(`seeded ${brandRows.length} brands with open campaigns`);

  // ------------------------------------------------------- history with shape
  // Completed bookings carrying real click and lead rows, so the brand
  // dashboard and the creator's earnings have something to show on camera.
  // Prices and views derive from each creator's own card rather than being
  // hardcoded, so a change to the pricing rule cannot leave the history
  // telling a different story from the marketplace.
  const history: {
    brand: string;
    creator: string;
    discountPct: number;
    /** clicks per 1,000 views on the post */
    ctrPerMille: number;
    /** leads per 100 clicks */
    conversionPct: number;
    postedDaysAgo: number;
  }[] = [
    { brand: "orbisearch", creator: "tomas-berg", discountPct: 10, ctrPerMille: 27, conversionPct: 2.0, postedDaysAgo: 26 },
    { brand: "orbisearch", creator: "ravi-menon", discountPct: 0, ctrPerMille: 31, conversionPct: 2.6, postedDaysAgo: 19 },
    { brand: "orbisearch", creator: "hannah-mueller", discountPct: 20, ctrPerMille: 29, conversionPct: 3.4, postedDaysAgo: 12 },
    { brand: "premium-inboxes", creator: "clara-dubois", discountPct: 10, ctrPerMille: 30, conversionPct: 2.3, postedDaysAgo: 22 },
    { brand: "premium-inboxes", creator: "elena-petrova", discountPct: 20, ctrPerMille: 33, conversionPct: 2.9, postedDaysAgo: 9 },
    { brand: "huxley-hr", creator: "amara-okafor", discountPct: 0, ctrPerMille: 28, conversionPct: 2.5, postedDaysAgo: 15 },
  ];

  for (const h of history) {
    const brand = brands[h.brand];
    const creator = creators[h.creator];
    const code = trackingCode();

    const priceCents = Math.round((creator.price * (100 - h.discountPct)) / 100);
    // A post reaches roughly its median; nudge it so the table is not uniform.
    const views = Math.round(creator.medianViews! * (0.85 + ((h.postedDaysAgo % 7) / 20)));
    const clicks = Math.max(1, Math.round((views * h.ctrPerMille) / 1000));
    const leads = Math.max(1, Math.round((clicks * h.conversionPct) / 100));

    const offer = await prisma.offer.create({
      data: {
        campaignId: brand.campaignId,
        creatorId: creator.id,
        brandId: brand.id,
        listPriceCents: creator.price,
        offerPriceCents: priceCents,
        discountPct: h.discountPct,
        postBy: daysAgo(h.postedDaysAgo - 3),
        status: "accepted",
        expiresAt: daysAgo(h.postedDaysAgo + 5),
        createdAt: daysAgo(h.postedDaysAgo + 7),
      },
    });

    const booking = await prisma.booking.create({
      data: {
        offerId: offer.id,
        campaignId: brand.campaignId,
        creatorId: creator.id,
        brandId: brand.id,
        agreedPriceCents: priceCents,
        postBy: daysAgo(h.postedDaysAgo - 3),
        status: "completed",
        postUrl: `https://www.linkedin.com/posts/${h.creator}-activity-${randomBytes(4).toString("hex")}`,
        postedAt: daysAgo(h.postedDaysAgo),
        selfReportedViews: views,
        trackingCode: code,
        createdAt: daysAgo(h.postedDaysAgo + 6),
        completedAt: daysAgo(Math.max(1, h.postedDaysAgo - 7)),
      },
    });

    // Clicks, spread across the days after the post went up.
    await prisma.clickEvent.createMany({
      data: Array.from({ length: clicks }, (_, i) => ({
        bookingId: booking.id,
        trackingCode: code,
        occurredAt: daysAgo(Math.max(0, h.postedDaysAgo - Math.floor((i / clicks) * 7))),
        referrer: "https://www.linkedin.com/",
        uaFamily: i % 3 === 0 ? "Safari" : "Chrome",
      })),
    });

    await prisma.lead.createMany({
      data: Array.from({ length: leads }, (_, i) => ({
        bookingId: booking.id,
        campaignId: brand.campaignId,
        trackingCode: code,
        email: `lead${i + 1}.${h.creator}@example.com`,
        company: `Company ${String.fromCharCode(65 + (i % 26))}${i}`,
        occurredAt: daysAgo(Math.max(0, h.postedDaysAgo - Math.floor((i / leads) * 7))),
        pipelineValueCents: brandRows.find((b) => b.slug === h.brand)!.campaign.dealValue,
      })),
    });

    // Three ledger rows per booking: hold, charge, payout.
    const creatorAccount = await prisma.creator.findUniqueOrThrow({
      where: { id: creator.id },
      select: { accountId: true },
    });
    await prisma.ledgerEntry.createMany({
      data: [
        // The same three rows the live path writes: a hold on the brand at
        // acceptance, an earning credited to the creator at completion, and a
        // payout debited when they withdraw. The hold is the charge; the
        // agreed price is frozen at acceptance and never moves, so a second
        // brand debit would charge them twice.
        { accountId: brand.accountId, bookingId: booking.id, direction: "debit", amountCents: priceCents, kind: "booking_hold", memo: "Booking accepted — funds held", createdAt: daysAgo(h.postedDaysAgo + 6) },
        { accountId: creatorAccount.accountId, bookingId: booking.id, direction: "credit", amountCents: priceCents, kind: "creator_earning", memo: "Post published — earning credited", createdAt: daysAgo(h.postedDaysAgo) },
        { accountId: creatorAccount.accountId, bookingId: booking.id, direction: "debit", amountCents: priceCents, kind: "payout", memo: "Payout sent", createdAt: daysAgo(Math.max(1, h.postedDaysAgo - 7)) },
      ],
    });
    await prisma.payout.create({
      data: {
        creatorId: creator.id,
        bookingId: booking.id,
        amountCents: priceCents,
        status: "paid",
        scheduledFor: daysAgo(Math.max(1, h.postedDaysAgo - 5)),
        paidAt: daysAgo(Math.max(1, h.postedDaysAgo - 7)),
      },
    });
  }
  console.log(`seeded ${history.length} completed bookings with clicks and leads`);

  // A live post still accruing, so "measuring" is visible without waiting.
  {
    const brand = brands["ledgerloop"];
    const creator = creators["daniel-mwangi"];
    const code = trackingCode();
    const offer = await prisma.offer.create({
      data: {
        campaignId: brand.campaignId,
        creatorId: creator.id,
        brandId: brand.id,
        listPriceCents: creator.price,
        offerPriceCents: Math.round(creator.price * 0.8),
        discountPct: 20,
        postBy: daysFromNow(6),
        status: "accepted",
        expiresAt: daysAgo(1),
        createdAt: daysAgo(4),
      },
    });
    const booking = await prisma.booking.create({
      data: {
        offerId: offer.id,
        campaignId: brand.campaignId,
        creatorId: creator.id,
        brandId: brand.id,
        agreedPriceCents: Math.round(creator.price * 0.8),
        postBy: daysFromNow(6),
        status: "measuring",
        postUrl: `https://www.linkedin.com/posts/daniel-mwangi-activity-${randomBytes(4).toString("hex")}`,
        postedAt: daysAgo(2),
        selfReportedViews: 9100,
        trackingCode: code,
        createdAt: daysAgo(4),
      },
    });
    await prisma.clickEvent.createMany({
      data: Array.from({ length: 214 }, (_, i) => ({
        bookingId: booking.id,
        trackingCode: code,
        occurredAt: daysAgo(i % 2),
        referrer: "https://www.linkedin.com/",
        uaFamily: "Chrome",
      })),
    });
    await prisma.lead.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        bookingId: booking.id,
        campaignId: brand.campaignId,
        trackingCode: code,
        email: `lead${i + 1}.daniel@example.com`,
        pipelineValueCents: 520000,
      })),
    });
  }

  // A live offer sitting in a creator's inbox with the 48-hour clock running,
  // so the countdown is on screen the moment you sign in as that creator.
  {
    const brand = brands["huxley-hr"];
    const creator = creators["priya-shah"];
    await prisma.offer.create({
      data: {
        campaignId: brand.campaignId,
        creatorId: creator.id,
        brandId: brand.id,
        listPriceCents: creator.price,
        offerPriceCents: Math.round(creator.price * 0.9),
        discountPct: 10,
        postBy: daysFromNow(14),
        status: "offered",
        expiresAt: new Date(Date.now() + 31 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 17 * 60 * 60 * 1000),
      },
    });
  }

  console.log("\ndone.");
  console.log(`  brand login:   orbisearch@demo.naano.test / ${DEMO_PASSWORD}`);
  console.log(`  creator login: priya-shah@demo.naano.test / ${DEMO_PASSWORD}  (has a live offer)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
