import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./db";
import { normalizeLinkedinSlug, canonicalLinkedinUrl } from "./pricing";
import cached from "../../data/cached-profiles.json";

/**
 * The importer.
 *
 * Not two swappable implementations behind an env flag, but one three-tier
 * resolution chain. A flag would have forced a choice between a camera-safe
 * demo and a working product. The chain gives both:
 *
 *   1. cache  - seeded profiles and anything already read. Resolves locally,
 *               deterministically, with no network call. Every URL the demo
 *               touches lands here.
 *   2. live   - a miss calls the profile service server-side, then writes the
 *               result back into the cache so a profile is only ever read once.
 *               This is the tier a stranger's own profile lands on.
 *   3. manual - a timeout, a failure, or an unknown profile falls through to
 *               manual entry of the five named fields. Signup never blocks.
 *
 * Tier selection is automatic. The cache write in tier 2 means the second
 * visitor to any profile gets tier 1 for free.
 */

/**
 * Exactly the five fields the consent sentence names:
 * "name, photo, headline, country and follower count".
 * Posts, engagement and private analytics are not read, and the service's
 * about/experience/education/skills are dropped on the floor right here.
 */
export type ImportedProfile = {
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  country: string;
  countryCode: string;
  followerCount: number;
};

export type ImportResult =
  | {
      ok: true;
      tier: "cache" | "live";
      freshness: "live" | "cached" | "stale";
      slug: string;
      profile: ImportedProfile;
    }
  | {
      ok: false;
      reason: "invalid_url" | "already_claimed" | "rate_limited" | "unavailable";
      slug: string | null;
      /** Signup continues by hand. A failed import is slower, never a dead end. */
      fallback: "manual";
    };

const LIVE_TIMEOUT_MS = 4000;
const RATE_LIMIT_PER_HOUR = 5;

type ServiceProfile = {
  name?: string;
  headline?: string;
  location?: { country?: string; countryCode?: string };
  followerCount?: number;
  images?: { avatar?: string | null };
  meta?: { source?: string };
};

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Narrow whatever the service returned down to the five consented fields. */
function toImported(raw: ServiceProfile): ImportedProfile | null {
  const fullName = typeof raw.name === "string" ? raw.name.trim() : "";
  const followerCount =
    typeof raw.followerCount === "number" && raw.followerCount >= 0
      ? Math.round(raw.followerCount)
      : null;

  // Name and follower count are the two the card cannot be built without:
  // the name is the identity, the follower count is the entire price.
  if (!fullName || followerCount === null) return null;

  return {
    fullName,
    avatarUrl: raw.images?.avatar ?? null,
    headline: typeof raw.headline === "string" ? raw.headline.trim() : null,
    country: raw.location?.country?.trim() || "Unknown",
    countryCode: (raw.location?.countryCode || "").toUpperCase().slice(0, 2),
    followerCount,
  };
}

// ------------------------------------------------------------- tier 1: cache

const SEEDED = cached as unknown as Record<string, ServiceProfile>;

async function fromCache(slug: string) {
  const seeded = SEEDED[slug];
  if (seeded) return { raw: seeded, freshness: "cached" as const };

  // Anything read before, by anyone. This is what makes the consent sentence's
  // promise of a single read true across visitors, not just within one session.
  const prior = await prisma.profileImport.findFirst({
    where: { urlSlug: slug, status: "ok" },
    orderBy: { fetchedAt: "desc" },
    select: { rawPayload: true, fetchedAt: true },
  });
  if (!prior?.rawPayload) return null;

  const ageDays =
    (Date.now() - prior.fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
  return {
    raw: prior.rawPayload as ServiceProfile,
    freshness: ageDays > 30 ? ("stale" as const) : ("cached" as const),
  };
}

// -------------------------------------------------------------- tier 2: live

async function fromLive(slug: string) {
  const base = process.env.PROFILE_SERVICE_URL;
  const key = process.env.PROFILE_SERVICE_KEY;
  if (!base) return null; // no service configured yet: skip straight to manual

  const url = new URL(base);
  url.searchParams.set("url", canonicalLinkedinUrl(slug));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ServiceProfile;
    const freshness =
      body.meta?.source === "live"
        ? ("live" as const)
        : body.meta?.source === "stale"
          ? ("stale" as const)
          : ("cached" as const);
    return { raw: body, freshness };
  } catch {
    // Timeout or transport failure. The caller falls through to manual.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------ the chain

export async function importProfile(
  inputUrl: string,
  ctx: { ip?: string | null } = {},
): Promise<ImportResult> {
  const slug = normalizeLinkedinSlug(inputUrl);
  if (!slug) {
    return { ok: false, reason: "invalid_url", slug: null, fallback: "manual" };
  }

  // Dedupe. The second person to paste a profile already claimed is told the
  // card exists; they do not get a duplicate listing in the marketplace.
  const claimed = await prisma.creator.findUnique({
    where: { urlSlug: slug },
    select: { id: true },
  });
  if (claimed) {
    return { ok: false, reason: "already_claimed", slug, fallback: "manual" };
  }

  const cacheHit = await fromCache(slug);
  if (cacheHit) {
    const profile = toImported(cacheHit.raw);
    if (profile) {
      await recordImport({
        slug,
        tier: "cache",
        status: "ok",
        freshness: cacheHit.freshness,
        raw: cacheHit.raw,
        ip: ctx.ip,
      });
      return {
        ok: true,
        tier: "cache",
        freshness: cacheHit.freshness,
        slug,
        profile,
      };
    }
  }

  // Only a live call is metered. Cache hits cost nothing, so they are free.
  const ipHash = ctx.ip ? hashIp(ctx.ip) : null;
  if (ipHash) {
    const recent = await prisma.profileImport.count({
      where: {
        ipHash,
        tier: "live",
        fetchedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recent >= RATE_LIMIT_PER_HOUR) {
      return { ok: false, reason: "rate_limited", slug, fallback: "manual" };
    }
  }

  const live = await fromLive(slug);
  if (live) {
    const profile = toImported(live.raw);
    if (profile) {
      await recordImport({
        slug,
        tier: "live",
        status: "ok",
        freshness: live.freshness,
        raw: live.raw,
        ip: ctx.ip,
      });
      return { ok: true, tier: "live", freshness: live.freshness, slug, profile };
    }
  }

  await recordImport({
    slug,
    tier: "manual",
    status: process.env.PROFILE_SERVICE_URL ? "timeout" : "failed",
    freshness: null,
    raw: null,
    ip: ctx.ip,
    error: process.env.PROFILE_SERVICE_URL
      ? "service did not answer in time"
      : "no profile service configured",
  });

  return { ok: false, reason: "unavailable", slug, fallback: "manual" };
}

/** Seed-only bookkeeping keys must not end up in the audit record. What we
 *  store should be what the service returned, and nothing of ours. */
function stripInternal(raw: ServiceProfile | null) {
  if (!raw) return undefined;
  const clean = Object.fromEntries(
    Object.entries(raw).filter(([k]) => !k.startsWith("_")),
  );
  return clean as object;
}

async function recordImport(args: {
  slug: string;
  tier: "cache" | "live" | "manual";
  status: "ok" | "timeout" | "failed";
  freshness: "live" | "cached" | "stale" | null;
  raw: ServiceProfile | null;
  ip?: string | null;
  error?: string;
}) {
  await prisma.profileImport.create({
    data: {
      sourceUrl: canonicalLinkedinUrl(args.slug),
      urlSlug: args.slug,
      tier: args.tier,
      status: args.status,
      freshness: args.freshness ?? undefined,
      rawPayload: stripInternal(args.raw),
      ipHash: args.ip ? hashIp(args.ip) : undefined,
      errorMessage: args.error,
    },
  });
}

/** Whether tier 2 is wired up. Surfaced in the UI so the state is never a lie. */
export function liveTierConfigured() {
  return Boolean(process.env.PROFILE_SERVICE_URL);
}
