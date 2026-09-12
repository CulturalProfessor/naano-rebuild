/**
 * Dates the server and the client can agree on.
 *
 * The offer modal shows "14 days from now" next to a date input. Computing
 * today in the browser and on the server produces two different strings either
 * side of midnight UTC, and React calls that a hydration error. So the server
 * computes both and hands them down as props.
 */

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** "25 Sep 2026", the shape the booking and offer rows use. */
export function formatDay(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "14 Sep 2026, 09:08". Formatted once, on the server, and passed down: the
 *  browser's locale and time zone are not the server's, and a date formatted
 *  independently on each side is a hydration mismatch. */
export function formatDayTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * The instant this request rendered.
 *
 * Reading the clock inside a component is impure by React's rules. In a Server
 * Component it is also the point: the page renders once per request, and
 * handing that instant to the client is what makes the first paint of a
 * countdown agree with its hydration instead of drifting a second apart. Doing
 * it behind a function keeps the impurity in one named place.
 */
export function requestNow(): number {
  return Date.now();
}
