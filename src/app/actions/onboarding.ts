"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/auth";
import { importProfile, type ImportedProfile } from "@/lib/profile-importer";
import {
  derivePricePerPostCents,
  deriveDisplayName,
  canonicalLinkedinUrl,
  normalizeLinkedinSlug,
} from "@/lib/pricing";
import { MAX_INDUSTRIES, INDUSTRIES } from "@/lib/queries";

/** A cache hit resolves instantly. Hold it so the reading state is a state the
 *  creator can actually see, rather than a flash. */
const READING_FLOOR_MS = 1200;

export type DraftCard = {
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  country: string;
  countryCode: string;
  followerCount: number | null;
  pricePerPostCents: number | null;
  industries: string[];
};

export type ImportState =
  | { status: "idle" }
  | {
      status: "done";
      card: DraftCard;
      tier: string;
      freshness: string;
      /** Where the service told us its own answer was thin. */
      limitations: string[];
    }
  | {
      status: "manual";
      message: string;
      /** Prefill what we can so manual entry is a short form, not a long one. */
      slug: string | null;
    };

async function callerIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

function cardFrom(profile: ImportedProfile, industries: string[] = []): DraftCard {
  return {
    displayName: deriveDisplayName(profile.fullName),
    headline: profile.headline,
    avatarUrl: profile.avatarUrl,
    country: profile.country,
    countryCode: profile.countryCode,
    followerCount: profile.followerCount,
    pricePerPostCents: derivePricePerPostCents(profile.followerCount),
    industries,
  };
}

/**
 * Step 2. The creator pastes a public profile URL and authorizes a single read
 * of five named fields. Everything else the service returns is discarded in the
 * importer before it reaches here.
 */
export async function readProfile(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const account = await requireAccount();
  const url = String(formData.get("linkedinUrl") ?? "");

  const started = Date.now();
  const result = await importProfile(url, { ip: await callerIp() });
  const elapsed = Date.now() - started;
  if (elapsed < READING_FLOOR_MS) {
    await new Promise((r) => setTimeout(r, READING_FLOOR_MS - elapsed));
  }

  if (!result.ok) {
    const message =
      result.reason === "invalid_url"
        ? "That is not a public LinkedIn profile URL. It looks like linkedin.com/in/your-name."
        : result.reason === "already_claimed"
          ? "A card already exists for that profile. Sign in to the account that claimed it."
          : result.reason === "rate_limited"
            ? "Too many reads from here in the last hour. Enter your details by hand and carry on."
            : result.reason === "quota_exhausted"
              ? "We have used today's profile reads. Enter your details by hand and carry on."
              : "We could not reach your profile just now. Enter your details by hand and carry on.";
    return { status: "manual", message, slug: result.slug };
  }

  const profile = result.profile;
  const creator = await prisma.creator.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      linkedinUrl: canonicalLinkedinUrl(result.slug),
      urlSlug: result.slug,
      fullName: profile.fullName,
      displayName: deriveDisplayName(profile.fullName),
      avatarUrl: profile.avatarUrl,
      headline: profile.headline,
      country: profile.country,
      countryCode: profile.countryCode,
      followerCount: profile.followerCount,
      industries: [],
      pricePerPostCents: derivePricePerPostCents(profile.followerCount),
      cardStatus: "draft",
      dataState: "pending",
    },
    update: {
      linkedinUrl: canonicalLinkedinUrl(result.slug),
      urlSlug: result.slug,
      fullName: profile.fullName,
      displayName: deriveDisplayName(profile.fullName),
      avatarUrl: profile.avatarUrl,
      headline: profile.headline,
      country: profile.country,
      countryCode: profile.countryCode,
      followerCount: profile.followerCount,
      pricePerPostCents: derivePricePerPostCents(profile.followerCount),
      cardStatus: "draft",
    },
  });

  await attachImportTo(creator.id, result.slug);

  return {
    status: "done",
    card: cardFrom(profile),
    tier: result.tier,
    freshness: result.freshness,
    limitations: result.limitations,
  };
}

/**
 * The importer writes its audit row before a creator exists, because dedupe and
 * rate limiting both run before the card does. Link it back once there is
 * something to link to, otherwise the consent record is orphaned and the
 * promise it exists to make checkable is not checkable for this creator.
 */
async function attachImportTo(creatorId: string, slug: string) {
  const latest = await prisma.profileImport.findFirst({
    where: { urlSlug: slug, creatorId: null },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });
  if (latest) {
    await prisma.profileImport.update({
      where: { id: latest.id },
      data: { creatorId },
    });
  }
}

/** The fallback path. Same five fields, typed instead of read. */
export async function saveManualProfile(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const account = await requireAccount();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim();
  const followerCount = Number(formData.get("followerCount"));
  const rawUrl = String(formData.get("linkedinUrl") ?? "");
  const slug = normalizeLinkedinSlug(rawUrl);

  if (!fullName || !country || !Number.isFinite(followerCount) || followerCount < 0) {
    return {
      status: "manual",
      message: "Name, country and follower count are needed to build the card.",
      slug,
    };
  }

  const profile: ImportedProfile = {
    fullName,
    headline,
    avatarUrl: null,
    country,
    countryCode: String(formData.get("countryCode") ?? "").toUpperCase().slice(0, 2),
    followerCount: Math.round(followerCount),
  };

  // Without a URL there is no dedupe key, so fall back to a per-account one.
  const urlSlug = slug ?? `manual-${account.id.slice(-10)}`;
  const linkedinUrl = slug ? canonicalLinkedinUrl(slug) : rawUrl || "";

  // Both of those columns are unique. The importer already refuses a profile
  // another account has claimed, but it drops the person into this form with
  // the URL still filled in, and typing the details by hand used to reach the
  // upsert and come back as a 500. A claimed profile is a thing to say, not a
  // thing to crash on.
  if (urlSlug || linkedinUrl) {
    const taken = await prisma.creator.findFirst({
      where: {
        accountId: { not: account.id },
        OR: [
          ...(urlSlug ? [{ urlSlug }] : []),
          ...(linkedinUrl ? [{ linkedinUrl }] : []),
        ],
      },
      select: { id: true },
    });
    if (taken) {
      return {
        status: "manual",
        message:
          "A card already exists for that profile. Sign in to the account that claimed it, or use your own profile URL.",
        slug,
      };
    }
  }

  const creator = await prisma.creator.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      linkedinUrl,
      urlSlug,
      fullName: profile.fullName,
      displayName: deriveDisplayName(profile.fullName),
      avatarUrl: null,
      headline: profile.headline,
      country: profile.country,
      countryCode: profile.countryCode,
      followerCount: profile.followerCount,
      industries: [],
      pricePerPostCents: derivePricePerPostCents(profile.followerCount),
      cardStatus: "draft",
      dataState: "pending",
    },
    update: {
      fullName: profile.fullName,
      displayName: deriveDisplayName(profile.fullName),
      headline: profile.headline,
      country: profile.country,
      countryCode: profile.countryCode,
      followerCount: profile.followerCount,
      pricePerPostCents: derivePricePerPostCents(profile.followerCount),
      cardStatus: "draft",
    },
  });

  // Typed, not read. Recorded all the same, so the card's provenance is never
  // a guess later on.
  await prisma.profileImport.create({
    data: {
      creatorId: creator.id,
      sourceUrl: linkedinUrl,
      urlSlug,
      tier: "manual",
      status: "ok",
      fieldsUsed: ["name", "headline", "country", "followerCount"],
    },
  });

  return {
    status: "done",
    card: cardFrom(profile),
    tier: "manual",
    freshness: "live",
    limitations: [],
  };
}

/** Step 3: confirm country, pick up to three industries. */
export async function saveCardDetails(formData: FormData) {
  const account = await requireAccount();
  const country = String(formData.get("country") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").toUpperCase().slice(0, 2);
  const industries = formData
    .getAll("industries")
    .map(String)
    .filter((i) => (INDUSTRIES as readonly string[]).includes(i))
    .slice(0, MAX_INDUSTRIES);

  await prisma.creator.update({
    where: { accountId: account.id },
    data: {
      ...(country ? { country } : {}),
      ...(countryCode ? { countryCode } : {}),
      industries,
    },
  });

  redirect("/onboarding/price");
}

/** Step 4: the recommended price, editable, plus an optional bundle. */
export async function savePrice(formData: FormData) {
  const account = await requireAccount();
  const euros = Number(formData.get("pricePerPost"));
  if (!Number.isFinite(euros) || euros < 1) {
    redirect("/onboarding/price?error=price");
  }
  const pricePerPostCents = Math.round(euros * 100);

  const bundleCount = Number(formData.get("bundlePostCount"));
  const bundleTotal = Number(formData.get("bundleTotal"));
  const wantsBundle =
    Number.isFinite(bundleCount) &&
    bundleCount > 1 &&
    Number.isFinite(bundleTotal) &&
    bundleTotal > 0;

  const creator = await prisma.creator.update({
    where: { accountId: account.id },
    data: { pricePerPostCents, cardStatus: "live" },
    select: { id: true, urlSlug: true },
  });

  await prisma.bundle.deleteMany({ where: { creatorId: creator.id } });
  if (wantsBundle) {
    await prisma.bundle.create({
      data: {
        creatorId: creator.id,
        postCount: Math.round(bundleCount),
        totalPriceCents: Math.round(bundleTotal * 100),
        isPrimary: true,
      },
    });
  }

  redirect("/onboarding/done");
}
