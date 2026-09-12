/**
 * The rules the marketplace rests on.
 *
 * Two of them are load-bearing and both were read off the recon, not invented:
 *
 *  1. A creator's price is derived from follower count before the creator has
 *     an opinion. That is what makes a sixty-second-old card bookable, which is
 *     what makes the supply side liquid on day one.
 *
 *  2. A field with no data renders as a dash, never as a zero and never as a
 *     guess. Price can be derived from followers honestly. Impressions cannot.
 *     `Metric` below makes the second case unrepresentable-by-accident.
 */

/** 2,438 followers produced EUR 315 in the recon. 315 / 2438 = 0.1292. */
export const PRICE_PER_FOLLOWER_CENTS = 13;

/** Prices land on a round number. EUR 316.94 was shown as EUR 315. */
const PRICE_ROUNDING_EUROS = 5;

/**
 * The band the 13c rule was calibrated against.
 *
 * The recon's creators ran roughly 3,000 to 11,000 followers, and B2B LinkedIn
 * creators generally live in the thousands. The arithmetic keeps working above
 * that, but it stops meaning anything: paste a public figure with twelve
 * million followers and it recommends a price north of a million euro. That is
 * a real thing a curious visitor will do on the first try.
 *
 * We still show the number rather than silently capping it, because a capped
 * price would be a quiet lie about what the rule computed. We say instead that
 * it is outside the range the rule was built for, and hand the creator the
 * field. Same instinct as the dash: name the limit, do not paper over it.
 */
export const CALIBRATED_FOLLOWER_CEILING = 150_000;

export function priceIsCalibrated(followerCount: number): boolean {
  return followerCount <= CALIBRATED_FOLLOWER_CEILING;
}

/**
 * The recommended starting price. The creator can change it now or later, and
 * most eventually do, which is why this is a default and not a stored truth.
 */
export function derivePricePerPostCents(followerCount: number): number {
  const raw = followerCount * PRICE_PER_FOLLOWER_CENTS;
  const step = PRICE_ROUNDING_EUROS * 100;
  return Math.max(step, Math.round(raw / step) * step);
}

/**
 * CPM is never an input. It is the column that makes a EUR 1,375 creator and a
 * EUR 488 creator comparable, and it reproduced all four rows of the brand
 * shortlist to the euro:
 *   1375 / 40.2K = 34    488 / 41.2K = 12
 *   1125 / 79.4K = 14    688 / 14.4K = 48
 *
 * Returns null when median views is unknown, because a CPM without a
 * denominator is a fabricated number. Null is the honest answer.
 */
export function deriveCpmCents(
  pricePerPostCents: number,
  medianViews: number | null | undefined,
): number | null {
  if (!medianViews || medianViews <= 0) return null;
  return Math.round((pricePerPostCents / medianViews) * 1000);
}

/**
 * The recon: 5 posts at EUR 1,340 showed "EUR 268/post - brand saves EUR 235".
 * 5 x 315 = 1,575, and 1,575 - 1,340 = 235.
 */
export function bundleEconomics(
  postCount: number,
  totalPriceCents: number,
  unitPriceCents: number,
) {
  return {
    perPostCents: Math.round(totalPriceCents / postCount),
    savingsCents: postCount * unitPriceCents - totalPriceCents,
  };
}

/** The discount tiles on the offer modal, in order. */
export const DISCOUNT_STEPS = [10, 20, 30] as const;

export function discountedCents(listCents: number, pct: number): number {
  return Math.round(listCents * (1 - pct / 100));
}

export function discountPctOf(listCents: number, offerCents: number): number {
  if (listCents <= 0) return 0;
  return Math.round(((listCents - offerCents) / listCents) * 100);
}

/** "The creator receives the offer immediately and can accept or decline it
 *  within 48 hours." Read off the offer modal. It is a real state, not copy. */
export const OFFER_WINDOW_HOURS = 48;

/** "Latest date the creator must publish the post. Defaults to 14 days." */
export const DEFAULT_POST_BY_DAYS = 14;

// ---------------------------------------------------------------- the dash rule

/**
 * A number we measured, or an explicit admission that we have not measured it.
 * There is no third case, and in particular there is no "0".
 */
export type Metric =
  | { known: true; value: number }
  | { known: false; reason: "pending" };

export function known(value: number): Metric {
  return { known: true, value };
}

export function pending(): Metric {
  return { known: false, reason: "pending" };
}

export function metricOf(value: number | null | undefined): Metric {
  return value === null || value === undefined ? pending() : known(value);
}

/** The em dash the card shows for anything we have not measured. */
export const DASH = "—";

// ---------------------------------------------------------------- formatting

export function formatEuros(
  cents: number,
  opts: { decimals?: boolean } = {},
): string {
  const value = cents / 100;
  const showDecimals = opts.decimals ?? value % 1 !== 0;
  const digits = showDecimals ? 2 : 0;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatMoneyMetric(metric: Metric): string {
  return metric.known ? formatEuros(metric.value) : DASH;
}

/** 2,438 renders as "2.4K" on the card. */
export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCountMetric(metric: Metric): string {
  return metric.known ? compactNumber(metric.value) : DASH;
}

// ---------------------------------------------------------------- identity

/**
 * The card shows "Shubham P.", not the full surname. First name plus last
 * initial: enough for a brand to recognise a person, short enough to fit.
 */
export function deriveDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last[0].toUpperCase()}.`;
}

/**
 * Normalize a public LinkedIn URL to the profile slug. This is the dedupe key
 * and the cache key for tier 1 of the importer, so it has to be stable across
 * the many shapes people paste.
 */
export function normalizeLinkedinSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;

  const match = url.pathname.match(/\/in\/([^/]+)/i);
  if (!match) return null;

  const slug = decodeURIComponent(match[1]).toLowerCase().replace(/\/+$/, "");
  return /^[a-z0-9\-_%.]+$/i.test(slug) && slug.length <= 120 ? slug : null;
}

export function canonicalLinkedinUrl(slug: string): string {
  return `https://www.linkedin.com/in/${slug}`;
}

/**
 * The floor of the band. The brand picks 10, 20 or 30 percent off, or types a
 * number inside the same range, and cannot go below it. This is the rule that
 * keeps the marketplace transactional instead of turning every booking into a
 * negotiation, and it is the other half of deriving the price from followers.
 */
export const MAX_DISCOUNT_PCT = 30;
