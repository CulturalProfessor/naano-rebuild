"use client";

import { useEffect, useState } from "react";

/**
 * The 48-hour clock, ticking.
 *
 * The first render uses the server's idea of "now" so SSR and hydration agree;
 * after mount it switches to the browser's clock and ticks every second. The
 * offer's expiry is a timestamp in the database, not a scheduled job, so this
 * is a view of the truth rather than the thing that enforces it.
 */
export function Countdown({
  expiresAt,
  serverNow,
  expiresLabel,
  className = "",
}: {
  expiresAt: string;
  serverNow: number;
  /** Formatted on the server. Formatting it here would hydrate differently in
   *  any browser whose locale or time zone is not the server's. */
  expiresLabel?: string;
  className?: string;
}) {
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = useState(serverNow);

  // The interval is the only writer. Setting state once on mount as well would
  // be a cascading render for a value that is at most a few hundred
  // milliseconds stale on a forty-eight hour clock.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = target - now;
  if (left <= 0) {
    return <span className={`text-ink-mute ${className}`}>Expired</span>;
  }

  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const urgent = left < 6 * 3_600_000;

  return (
    <span
      className={`tabular-nums ${urgent ? "text-danger" : "text-ink"} ${className}`}
      title={expiresLabel ? `Expires ${expiresLabel}` : undefined}
    >
      {hours}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
    </span>
  );
}
