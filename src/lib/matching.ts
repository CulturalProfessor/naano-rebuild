import { regionForCountry } from "./geo";
import { deriveCpmCents, formatEuros, compactNumber, DASH } from "./pricing";

/**
 * The matcher.
 *
 * One function, both sides. The brand sees it as a ranked shortlist; the
 * creator sees the same number on an opportunity card. That is the point of
 * computing it rather than storing it: there is no way for the two views to
 * drift apart, and no row to migrate when the weights change.
 *
 * It is a scorer and a template, not a language model. That is a decision, not
 * a shortcut: the written rationale is the product here, and a deterministic
 * one is reproducible on camera, cannot invent a creator who is not in the
 * database, needs no API key, and costs nothing when a stranger hammers it.
 * The rationale is built from the reasons the scorer actually used, so it
 * cannot claim a reason the ranking did not apply.
 */

const WEIGHTS: Record<"topic" | "region" | "budget" | "audience", number> = {
  topic: 40,
  region: 20,
  budget: 20,
  audience: 20,
};

export type Reason = {
  key: "topic" | "region" | "budget" | "audience";
  points: number;
  max: number;
  /** A clause that reads inside a sentence, lower case, no full stop. */
  clause: string;
};

export type Score = {
  total: number;
  reasons: Reason[];
};

export type ScorableCreator = {
  displayName: string;
  industries: string[];
  countryCode: string;
  country: string;
  followerCount: number;
  medianViews: number | null;
  pricePerPostCents: number;
};

export type ScorableCampaign = {
  industries: string[];
  regions: string[];
  budgetCapCents: number | null;
};

/** The follower count at which the audience component is full marks. Set at the
 *  top of the band the 13c pricing rule was calibrated against. */
const AUDIENCE_FULL_AT = 20_000;

export function scoreMatch(
  creator: ScorableCreator,
  campaign: ScorableCampaign,
): Score {
  const reasons: Reason[] = [];

  // Topic. The single biggest input, because a creator whose audience does not
  // care about the category cannot be rescued by being cheap.
  const wanted = campaign.industries;
  const shared = creator.industries.filter((i) => wanted.includes(i));
  const topicPoints =
    wanted.length === 0
      ? WEIGHTS.topic // a campaign that named no industries rules nobody out
      : Math.round((shared.length / Math.min(wanted.length, 3)) * WEIGHTS.topic);
  reasons.push({
    key: "topic",
    points: Math.min(topicPoints, WEIGHTS.topic),
    max: WEIGHTS.topic,
    clause:
      shared.length > 0
        ? `writes about ${shared.join(" and ")}`
        : wanted.length === 0
          ? "fits a brief that names no particular topics"
          : `does not list any of ${wanted.slice(0, 3).join(", ")}`,
  });

  // Region.
  const region = regionForCountry(creator.countryCode);
  const inRegion =
    campaign.regions.length === 0 || (region !== null && campaign.regions.includes(region));
  reasons.push({
    key: "region",
    points: inRegion ? WEIGHTS.region : region === null ? WEIGHTS.region / 2 : 0,
    max: WEIGHTS.region,
    clause: inRegion
      ? `posts from ${creator.country}`
      : region === null
        ? `posts from ${creator.country}, which naano has not placed in a region`
        : `posts from ${creator.country}, outside ${campaign.regions.join(" and ")}`,
  });

  // Budget. Over the cap is not a disqualification, it is a smaller number, so
  // a brand can still see the creator they would stretch for.
  const cap = campaign.budgetCapCents;
  const price = creator.pricePerPostCents;
  let budgetPoints = WEIGHTS.budget;
  if (cap != null && price > cap) {
    const over = (price - cap) / cap;
    budgetPoints = Math.max(0, Math.round(WEIGHTS.budget * (1 - over * 2)));
  }
  reasons.push({
    key: "budget",
    points: budgetPoints,
    max: WEIGHTS.budget,
    clause:
      cap == null
        ? `lists ${formatEuros(price)} a post`
        : price <= cap
          ? `lists ${formatEuros(price)}, inside the ${formatEuros(cap)} cap`
          : `lists ${formatEuros(price)}, above the ${formatEuros(cap)} cap`,
  });

  // Audience. Follower count only, never measured views: a creator who signed
  // up an hour ago has no history, and scoring them down for that would make
  // the shortlist a ranking of tenure rather than of fit.
  const audiencePoints = Math.round(
    WEIGHTS.audience *
      Math.min(1, Math.log10(Math.max(creator.followerCount, 1) + 1) / Math.log10(AUDIENCE_FULL_AT)),
  );
  reasons.push({
    key: "audience",
    points: audiencePoints,
    max: WEIGHTS.audience,
    clause: `reaches ${compactNumber(creator.followerCount)} followers`,
  });

  return {
    total: Math.max(0, Math.min(100, reasons.reduce((s, r) => s + r.points, 0))),
    reasons,
  };
}

// ---------------------------------------------------------------- the write-up

export type Ranked = {
  creator: ScorableCreator & {
    id: string;
    urlSlug: string;
    avatarUrl: string | null;
    /** Labelled on the row, never hidden. See docs/PLAN.md section 6. */
    autoRespond: boolean;
  };
  score: Score;
};

/**
 * The rationale.
 *
 * A bare sorted list is a filter. A recommendation names the constraint it
 * respected and the trade-off it made, and can therefore be argued with. Every
 * sentence below is assembled from reasons the scorer returned, so the prose
 * and the ranking cannot disagree.
 */
export function buildRationale(
  brandName: string,
  ranked: Ranked[],
  campaign: ScorableCampaign,
): string[] {
  if (ranked.length === 0) {
    return [
      `No creator in the marketplace matches this brief yet. Widen the regions or the budget cap and ask again.`,
    ];
  }

  const opening = `I found ${ranked.length} creator${ranked.length === 1 ? "" : "s"} for ${brandName}, ranked by relevance to your brief, then by reach and cost.`;

  const perCreator = ranked
    .map(({ creator, score }) => {
      // Topic leads whenever it scored at all: it is the heaviest input to the
      // ranking, so opening on the budget would explain the shortlist with the
      // reason that mattered least. Cost comes second because region is full
      // marks for everyone who passed the filter, and four sentences that all
      // end "posts from Europe" tell the reader nothing.
      const ORDER: Record<Reason["key"], number> = {
        topic: 4,
        budget: 3,
        region: 2,
        audience: 1,
      };
      const best = [...score.reasons]
        .filter((r) => r.points > 0)
        .sort((a, b) => ORDER[b.key] - ORDER[a.key])
        .slice(0, 2)
        .map((r) => r.clause);
      return `${creator.displayName} ${best.join(", and ")}`;
    })
    .join(". ");

  // The trade-off. Two real ones exist in this data and the honest thing is to
  // name whichever the shortlist actually contains.
  const withHistory = ranked.filter((r) => r.creator.medianViews !== null);
  const withoutHistory = ranked.filter((r) => r.creator.medianViews === null);
  const prices = ranked.map((r) => r.creator.pricePerPostCents);
  const spread = Math.max(...prices) - Math.min(...prices);

  let tradeOff: string;
  if (withoutHistory.length > 0 && withHistory.length > 0) {
    tradeOff =
      `The trade-off is evidence: ${withHistory.length} of these have measured post history and a CPM you can compare, ` +
      `while ${withoutHistory.map((r) => r.creator.displayName).join(" and ")} ${withoutHistory.length === 1 ? "shows" : "show"} a dash instead of an estimate. ` +
      `Cheaper to test, harder to predict.`;
  } else if (spread > 50_000) {
    const dear = ranked.reduce((a, b) =>
      a.creator.pricePerPostCents > b.creator.pricePerPostCents ? a : b,
    );
    const cheap = ranked.reduce((a, b) =>
      a.creator.pricePerPostCents < b.creator.pricePerPostCents ? a : b,
    );
    const dearCpm = deriveCpmCents(dear.creator.pricePerPostCents, dear.creator.medianViews);
    const cheapCpm = deriveCpmCents(cheap.creator.pricePerPostCents, cheap.creator.medianViews);
    tradeOff =
      `The trade-off is price against reach: ${dear.creator.displayName} at ${formatEuros(dear.creator.pricePerPostCents)} ` +
      `costs ${dearCpm === null ? DASH : formatEuros(dearCpm)} per thousand views against ` +
      `${cheap.creator.displayName} at ${cheapCpm === null ? DASH : formatEuros(cheapCpm)}. ` +
      `CPM is the column that makes them comparable, and it is derived, never entered.`;
  } else {
    tradeOff =
      campaign.budgetCapCents != null
        ? `All of them sit inside the ${formatEuros(campaign.budgetCapCents)} cap, so the choice here is topic fit rather than cost.`
        : `The shortlist is tightly priced, so the choice here is topic fit rather than cost.`;
  }

  return [opening, `${perCreator}.`, tradeOff];
}

// ---------------------------------------------------------------- the prompt

export type ParsedPrompt = {
  count: number;
  maxPriceCents: number | null;
  industries: string[];
};

/**
 * What we actually read out of the prompt box.
 *
 * Not natural language understanding, and the UI says so rather than implying
 * otherwise: a count, a budget, and any industry named by one of our own chips.
 * Everything else in the sentence is echoed back and ignored, which is a small
 * honest thing rather than a large dishonest one.
 */
export function parsePrompt(
  prompt: string,
  knownIndustries: readonly string[],
): ParsedPrompt {
  const text = prompt.toLowerCase();

  const countMatch = text.match(/\b(\d{1,2})\s+creators?\b/);
  const count = countMatch ? Math.min(12, Math.max(1, Number(countMatch[1]))) : 4;

  // "under 1500", "€1,500", "1500 eur"
  const priceMatch = text.match(
    /(?:under|below|max|cap(?:ped)? at|€|eur\s*)\s*([\d,.]{3,9})/,
  );
  const raw = priceMatch ? Number(priceMatch[1].replace(/[,.]/g, "")) : NaN;
  const maxPriceCents = Number.isFinite(raw) && raw > 0 ? raw * 100 : null;

  const industries = knownIndustries.filter((i) =>
    new RegExp(`\\b${i.toLowerCase().replace(/[^a-z0-9]+/g, ".{0,3}")}\\b`).test(text),
  );

  return { count, maxPriceCents, industries };
}
