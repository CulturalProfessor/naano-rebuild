import {
  deriveCpmCents,
  formatEuros,
  metricOf,
  formatCountMetric,
  DASH,
  bundleEconomics,
} from "@/lib/pricing";
import { CardAvatar } from "@/components/card-avatar";

/**
 * The marketplace card.
 *
 * The object both sides share: the creator builds it during onboarding, the
 * brand browses it in the grid, and it renders in five places from this one
 * component. That is why it is hand-built rather than assembled from a
 * registry, and why every caller passes the same shape.
 *
 * The rule it enforces: a field with no data renders as a dash next to a bar
 * that says Pending. Never a zero, never a guess. Followers and price are
 * honest from day one because they derive from a single imported number.
 * Impressions are not, so they wait.
 */

export type CardCreator = {
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  countryCode: string;
  country: string;
  industries: string[];
  followerCount: number | null;
  medianViews: number | null;
  pricePerPostCents: number | null;
  dataState: "pending" | "partial" | "complete";
  bundle?: { postCount: number; totalPriceCents: number } | null;
};

function flagEmoji(countryCode: string) {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return null;
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-brand">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.25 8.25h4.5V23h-4.5V8.25zm7.5 0h4.31v2.02h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9V23h-4.5v-7.3c0-1.74-.03-3.98-2.43-3.98-2.43 0-2.8 1.9-2.8 3.86V23h-4.3V8.25z" />
    </svg>
  );
}

/** "Data ——— Pending". The bar is empty until a post history exists. */
function DataBar({ state }: { state: CardCreator["dataState"] }) {
  const pct = state === "complete" ? 100 : state === "partial" ? 45 : 0;
  const label =
    state === "complete" ? "Complete" : state === "partial" ? "Partial" : "Pending";
  return (
    <div className="flex shrink-0 items-center gap-3 px-5 py-3 text-[11px] text-ink-soft">
      <span>Data</span>
      <span className="h-1 flex-1 overflow-hidden rounded-pill bg-line">
        <span
          className="block h-full rounded-pill bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className={state === "complete" ? "text-success" : "text-ink-mute"}>
        {label}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  const isDash = value === DASH;
  return (
    <div className="flex-1 px-2 py-4 text-center">
      <div
        className={`font-display text-xl font-semibold tracking-tight ${
          isDash || muted ? "text-ink-mute" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-soft">{label}</div>
    </div>
  );
}

export function MarketplaceCard({
  creator,
  reading = false,
  className = "",
}: {
  creator: CardCreator;
  /** The step-2 state: chrome and skeleton render, values do not exist yet. */
  reading?: boolean;
  className?: string;
}) {
  const flag = flagEmoji(creator.countryCode);
  const cpm = creator.pricePerPostCents
    ? deriveCpmCents(creator.pricePerPostCents, creator.medianViews)
    : null;

  const bundle =
    creator.bundle && creator.pricePerPostCents
      ? bundleEconomics(
          creator.bundle.postCount,
          creator.bundle.totalPriceCents,
          creator.pricePerPostCents,
        )
      : null;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-hero bg-surface shadow-[var(--shadow-hero)] ${className}`}
    >
      {/* header */}
      <div className="relative h-24 shrink-0 bg-gradient-to-br from-brand to-brand-strong">
        <span className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-[10px] bg-white/95">
          <LinkedInGlyph />
        </span>
        {!reading && (
          <span className="absolute left-1/2 top-5 -translate-x-1/2 font-display text-sm font-bold tracking-tight text-white/95">
            naano
          </span>
        )}
        {flag && !reading && (
          <span className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[10px] bg-white/95 text-base">
            <span title={creator.country}>{flag}</span>
          </span>
        )}
        {reading && (
          // Where the wordmark sits, not the header's midpoint: the avatar
          // well starts 56px down and the two were overlapping.
          <span className="absolute left-1/2 top-3.5 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-pill bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-[var(--shadow-card)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Reading your profile…
          </span>
        )}
      </div>

      {/* avatar */}
      <div className="relative z-10 -mt-10 flex shrink-0 justify-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-3 ring-4 ring-white">
          <CardAvatar src={creator.avatarUrl} displayName={creator.displayName} />
        </div>
      </div>

      {/* identity */}
      <div className="flex flex-1 flex-col items-center px-6 pb-1 pt-3 text-center">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          {creator.displayName || "—"}
        </h3>
        {creator.industries.length > 0 ? (
          <p className="mt-1 text-sm text-ink-soft">
            {creator.industries.join(" · ")}
          </p>
        ) : (
          // Only a genuinely empty card gets the placeholder. Once a headline
          // has arrived it carries this line, and the topics slot waits quietly
          // for step 3 rather than talking over it.
          !creator.headline && (
            <p className="mt-1 text-sm text-ink-mute">
              Your LinkedIn headline and topics will appear here.
            </p>
          )
        )}
        {creator.headline && (
          <p className="mt-3 line-clamp-2 text-sm text-ink">{creator.headline}</p>
        )}
      </div>

      <DataBar state={creator.dataState} />

      {/* metrics */}
      <div className="flex shrink-0 divide-x divide-line border-t border-line">
        <Metric
          label="Followers"
          value={formatCountMetric(metricOf(creator.followerCount))}
        />
        <Metric
          label="Est. impressions"
          value={formatCountMetric(metricOf(creator.medianViews))}
        />
        <Metric
          label={creator.medianViews ? "Cost / post" : "Potential cost"}
          value={
            creator.pricePerPostCents
              ? formatEuros(creator.pricePerPostCents)
              : DASH
          }
        />
      </div>

      {/*
        Always rendered, so the metric strip above it lands on the same
        baseline in every card of a row. CPM keeps the dash rule rather than
        disappearing: no median views is a fact about the creator, not a
        reason to change the shape of the card.
      */}
      <div className="flex min-h-[49px] shrink-0 flex-wrap items-center justify-center gap-2 border-t border-line px-4 py-3">
        {bundle && creator.bundle && (
          <span className="rounded-pill bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
            {creator.bundle.postCount}-post bundle ·{" "}
            {formatEuros(creator.bundle.totalPriceCents)}
          </span>
        )}
        <span
          className={`rounded-pill bg-surface-3 px-3 py-1 text-xs ${
            cpm === null ? "text-ink-mute" : "text-ink-soft"
          }`}
        >
          {cpm === null ? `${DASH} CPM` : `${formatEuros(cpm)} CPM`}
        </span>
      </div>
    </article>
  );
}
