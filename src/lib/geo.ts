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

/**
 * Codes the profile service emits that are not the ISO code the rest of the
 * world uses. Intl resolves both of these to a country name, which is exactly
 * why they are dangerous: nothing looks wrong until the flag renders as two
 * letters and the region lookup quietly misses. Found by a creator in the
 * United Kingdom scoring zero on a campaign targeting Europe.
 */
const CODE_ALIASES: Record<string, string> = {
  UK: "GB", // the service's spelling; ISO says GB
  FX: "FR", // metropolitan France, deprecated in ISO 3166
  EL: "GR", // the EU's spelling for Greece
};

export function canonicalCountryCode(code: string): string {
  const upper = code.trim().toUpperCase();
  return CODE_ALIASES[upper] ?? upper;
}

/** "IE" -> "Ireland". Returns null for anything that is not a real region. */
export function countryNameFor(code: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  const upper = canonicalCountryCode(code);
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
      // Aliases resolve to the same display name as their canonical code and
      // would otherwise overwrite it, since they come later in the alphabet.
      // That is how "United Kingdom" started resolving to UK instead of GB.
      if (code in CODE_ALIASES) continue;
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
    const code = canonicalCountryCode(value);
    const name = countryNameFor(code);
    return name ? { country: name, countryCode: code } : { country: code, countryCode: "" };
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

/**
 * Regions, as the campaign form offers them.
 *
 * Deliberately coarse. A campaign says "Europe · North America" and a creator
 * has a country code, and the only question the matcher asks is whether one
 * sits inside the other. A finer taxonomy would be more correct and would
 * change no answer this product gives.
 */
export const REGIONS = [
  "Europe",
  "North America",
  "Latin America",
  "Asia Pacific",
  "Middle East & Africa",
] as const;

export type Region = (typeof REGIONS)[number];

const REGION_BY_CODE: Record<string, Region> = {};
const fill = (region: Region, codes: string[]) => {
  for (const c of codes) REGION_BY_CODE[c] = region;
};

fill("Europe", [
  "AL","AT","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FR",
  "GB","GR","HR","HU","IE","IS","IT","LT","LU","LV","MD","ME","MK","MT","NL",
  "NO","PL","PT","RO","RS","SE","SI","SK","UA","XK",
]);
fill("North America", ["CA", "US", "MX", "PR"]);
fill("Latin America", [
  "AR","BO","BR","CL","CO","CR","CU","DO","EC","GT","HN","NI","PA","PE","PY",
  "SV","UY","VE",
]);
fill("Asia Pacific", [
  "AU","BD","CN","HK","ID","IN","JP","KR","LK","MY","NP","NZ","PH","PK","SG",
  "TH","TW","VN",
]);
fill("Middle East & Africa", [
  "AE","BH","CI","DZ","EG","ET","GH","IL","JO","KE","KW","LB","MA","NG","OM",
  "QA","RW","SA","SN","TN","TR","TZ","UG","ZA",
]);

/** Null for a country we have not placed. The matcher treats that as unknown
 *  rather than as a mismatch, because the honest answer is that we do not know. */
export function regionForCountry(countryCode: string): Region | null {
  return REGION_BY_CODE[canonicalCountryCode(countryCode)] ?? null;
}
