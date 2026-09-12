/**
 * Country handling for the profile importer.
 *
 * The service returns `location` as a single string, and it is not one shape.
 * Sometimes it is a bare ISO country code ("US"), sometimes a place name, and
 * its own `limitations` array explains why:
 *
 *   "location is a country code only (e.g. 'IN') - LinkedIn's profile entity
 *    carries just geoLocation.geoUrn plus a country code..."
 *
 * The card wants two things from it: a display name and a two-letter code for
 * the flag. Both are derived here, and either may come back null, in which case
 * the card simply shows no flag rather than an invented one.
 */

const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

/** "IE" -> "Ireland". Returns null for anything that is not a real region. */
export function countryNameFor(code: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  const upper = code.toUpperCase();
  try {
    const name = regionNames?.of(upper);
    // Intl echoes the input back when it does not recognise the region.
    return name && name !== upper ? name : null;
  } catch {
    return null;
  }
}

/** Built once: every ISO-3166 alpha-2 code Intl recognises, keyed by name. */
const codeByName = (() => {
  const map = new Map<string, string>();
  if (!regionNames) return map;
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const name = countryNameFor(code);
      if (name) map.set(name.toLowerCase(), code);
    }
  }
  // Names people actually type that Intl spells differently.
  const aliases: [string, string][] = [
    ["usa", "US"],
    ["united states of america", "US"],
    ["uk", "GB"],
    ["united kingdom of great britain and northern ireland", "GB"],
    ["england", "GB"],
    ["scotland", "GB"],
    ["wales", "GB"],
    ["northern ireland", "GB"],
    ["south korea", "KR"],
    ["north korea", "KP"],
    ["russia", "RU"],
    ["czech republic", "CZ"],
    ["czechia", "CZ"],
    ["uae", "AE"],
    ["ivory coast", "CI"],
    ["turkey", "TR"],
    ["netherlands", "NL"],
    ["the netherlands", "NL"],
  ];
  for (const [name, code] of aliases) map.set(name, code);
  return map;
})();

export function countryCodeFor(name: string): string | null {
  return codeByName.get(name.trim().toLowerCase()) ?? null;
}

export type ResolvedLocation = { country: string; countryCode: string };

/**
 * Turn whatever the service gave us into a name and a code.
 *
 * Handles "US", "Ireland", "Dublin, Ireland" and "Bengaluru, Karnataka, India".
 * When only a place name resolves, the code comes back empty and the card drops
 * the flag. An unrecognised country is still shown as typed: the creator
 * confirms it at step 3 anyway, and showing their own words back beats
 * replacing them with "Unknown".
 */
export function resolveLocation(raw: string | null | undefined): ResolvedLocation {
  const value = (raw ?? "").trim();
  if (!value) return { country: "", countryCode: "" };

  // Bare country code, the shape the service warns about.
  if (/^[A-Za-z]{2}$/.test(value)) {
    const name = countryNameFor(value);
    return name
      ? { country: name, countryCode: value.toUpperCase() }
      : { country: value.toUpperCase(), countryCode: "" };
  }

  // "City, Region, Country" - the country is the last segment.
  const segments = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tail = segments[segments.length - 1] ?? value;

  const code = countryCodeFor(tail);
  if (code) return { country: tail, countryCode: code };

  // Try the whole string, in case it is a country name with a comma in it.
  const whole = countryCodeFor(value);
  if (whole) {
    return { country: countryNameFor(whole) ?? value, countryCode: whole };
  }

  return { country: tail, countryCode: "" };
}
