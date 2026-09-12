import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./db";
import { normalizeLinkedinSlug, canonicalLinkedinUrl } from "./pricing";
import { resolveLocation } from "./geo";
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
      /** The service says out loud where its own answer is thin. We pass it on
       *  rather than quietly presenting a partial read as a complete one. */
      limitations: string[];
    }
  | {
      ok: false;
      reason:
        | "invalid_url"
        | "already_claimed"
        | "rate_limited"
        | "quota_exhausted"
        | "unavailable";
      slug: string | null;
      /** Signup continues by hand. A failed import is slower, never a dead end. */
      fallback: "manual";
    };

/** Measured: the five consented fields cost three upstream requests and
 *  about 3.5s. A cold start costs more. Four seconds was too tight. */
const LIVE_TIMEOUT_MS = 15000;
const RATE_LIMIT_PER_HOUR = 5;

/**
 * The service's actual contract, from its OpenAPI spec. Note the shape: the
 * profile is nested, the keys are snake_case, `location` is one string rather
 * than an object, and `follower_count` is opt-in - it is absent unless named
 * in `fields`, and it is the single number our whole price rests on.
 */
type ServiceResponse = {
  source?: string;
  fetched_at?: string;
  meta?: {
    source?: string;
    cache_age_seconds?: number | null;
    upstream_requests?: number;
    quota_remaining?: number | null;
    fields?: string[];
  };
  profile?: {
    public_identifier?: string;
    name?: string;
    headline?: string | null;
    follower_count?: number | null;
    location?: string | null;
    images?: {
      profile_picture?: string | null;
      background_picture?: string | null;
    } | null;
  };
  /** The service says out loud where its own answer is thin. We keep it. */
  limitations?: string[];
};

/** What we persist and re-read from our own cache: the service response as-is. */
type ServiceProfile = ServiceResponse;

/**
 * Exactly the five fields the consent sentence names, and nothing else.
 *
 * The service takes a `fields` parameter, so the promise is enforced on the
 * wire rather than by us fetching everything and averting our eyes. It is also
 * the fast path: the full set is seven upstream requests and about 9.5s, this
 * is three and about 3.5s. `name` and `public_identifier` come free.
 */
const CONSENTED_FIELDS = "name,headline,follower_count,images,location";

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Narrow whatever the service returned down to the five consented fields. */
function toImported(raw: ServiceResponse): ImportedProfile | null {
  const p = raw.profile;
  if (!p) return null;

  const fullName = typeof p.name === "string" ? p.name.trim() : "";
  const followerCount =
    typeof p.follower_count === "number" && p.follower_count >= 0
      ? Math.round(p.follower_count)
      : null;

  // Name and follower count are the two the card cannot be built without: the
  // name is the identity, the follower count is the entire price. Anything else
  // missing is a thinner card; these missing means no card at all, so the
  // caller falls through to manual entry rather than inventing a number.
  if (!fullName || followerCount === null) return null;

  const { country, countryCode } = resolveLocation(p.location);

  return {
    fullName,
    avatarUrl: p.images?.profile_picture ?? null,
    headline: typeof p.headline === "string" ? p.headline.trim() : null,
    country,
    countryCode,
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

function serviceUrl() {
  return process.env.LINKEDIN_API || process.env.PROFILE_SERVICE_URL || "";
}

/**
 * The service's own daily quota is small and shared across everyone using this
 * deployment, and it does not cache repeats: the same profile fetched twice
 * costs twice. Our cache tier is what keeps that survivable, and this ceiling
 * is what stops a bad hour on a public URL from exhausting the day's budget and
 * taking the live tier down for everybody.
 */
const GLOBAL_LIVE_CALLS_PER_DAY = 40;

async function fromLive(slug: string) {
  const base = serviceUrl();
  if (!base) return null; // no service configured: skip straight to manual

  const url = new URL(base);
  url.searchParams.set("url", canonicalLinkedinUrl(slug));
  url.searchParams.set("fields", CONSENTED_FIELDS);

  const headers: Record<string, string> = { accept: "application/json" };
  const key = process.env.LINKEDIN_API_KEY || process.env.PROFILE_SERVICE_KEY;
  // The service authenticates with x-api-key, not a bearer token. It is
  // optional on this deployment today and may not be tomorrow.
  if (key) headers["x-api-key"] = key;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ServiceResponse;
    const source = body.meta?.source ?? body.source;
    const freshness =
      source === "live"
        ? ("live" as const)
        : source === "stale"
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
        limitations: cacheHit.raw.limitations ?? [],
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

  const liveToday = await prisma.profileImport.count({
    where: {
      tier: "live",
      fetchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (liveToday >= GLOBAL_LIVE_CALLS_PER_DAY) {
    return { ok: false, reason: "quota_exhausted", slug, fallback: "manual" };
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
      return {
        ok: true,
        tier: "live",
        freshness: live.freshness,
        slug,
        profile,
        limitations: live.raw.limitations ?? [],
      };
    }
  }

  await recordImport({
    slug,
    tier: "manual",
    status: serviceUrl() ? "timeout" : "failed",
    freshness: null,
    raw: null,
    ip: ctx.ip,
    error: serviceUrl()
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
  // What we actually asked for, as the service reports it back, rather than a
  // list we wrote down once and hoped stayed true.
  const fieldsUsed = args.raw?.meta?.fields?.length
    ? args.raw.meta.fields
    : CONSENTED_FIELDS.split(",");
  await prisma.profileImport.create({
    data: {
      sourceUrl: canonicalLinkedinUrl(args.slug),
      urlSlug: args.slug,
      tier: args.tier,
      status: args.status,
      freshness: args.freshness ?? undefined,
      rawPayload: stripInternal(args.raw),
      fieldsUsed,
      ipHash: args.ip ? hashIp(args.ip) : undefined,
      errorMessage: args.error,
    },
  });
}

/** Whether tier 2 is wired up. Surfaced in the UI so the state is never a lie. */
export function liveTierConfigured() {
  return Boolean(serviceUrl());
}
