/**
 * Generates data/cached-profiles.json: the cache tier of the importer chain.
 *
 * The shape here mirrors what the live profile service returns
 * (GET /profile?url=... -> name, headline, location, about, experience,
 * education, skills, images, followerCount, plus a meta block), so tier 1 and
 * tier 2 of the importer parse the same thing and the demo cannot drift from
 * production.
 *
 * These are invented people. Real creator names and photos from the reference
 * product are deliberately not used: this app is going to be public, and
 * seeding a live marketplace with real identities that never consented is not
 * a thing to do for a demo.
 *
 * Run: pnpm profiles
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Row = {
  slug: string;
  name: string;
  headline: string;
  city: string;
  country: string;
  cc: string;
  followers: number;
  industries: string[];
  /** null means no post history yet: the card shows a dash, never a zero. */
  medianViews: number | null;
  about: string;
  skills: string[];
};

// Spread across countries and industries so the marketplace filters have
// something to bite on. Four carry medianViews: null on purpose, so the dash
// rule is visible in the grid and not only during signup.
const ROWS: Row[] = [
  ["nina-costa", "Nina Costa", "Helping B2B SaaS teams turn product launches into pipeline", "Lisbon", "Portugal", "PT", 8200, ["B2B", "SaaS", "Marketing"], 34000, "Ex-demand gen lead. I write about launches that actually move revenue.", ["Demand Generation", "Product Marketing", "GTM"]],
  ["tomas-berg", "Tomas Berg", "Building in public - developer tools, DX and the occasional rant", "Stockholm", "Sweden", "SE", 11400, ["Developer Tools", "Software", "B2B"], 68000, "Engineer turned founder. Ten years of shipping tools other engineers use.", ["Developer Experience", "APIs", "Open Source"]],
  ["amara-okafor", "Amara Okafor", "HR Tech, hiring systems and why your ATS is the problem", "London", "United Kingdom", "GB", 5600, ["HR", "B2B", "SaaS"], 21000, "Talent operations for fast-scaling teams. I write about hiring that scales.", ["Talent Ops", "Recruiting", "People Analytics"]],
  ["luca-ferrari", "Luca Ferrari", "AI infrastructure, evals and what actually ships to production", "Milan", "Italy", "IT", 9800, ["AI", "Software", "Developer Tools"], 62000, "ML platform engineer. Less hype, more benchmarks.", ["LLMs", "MLOps", "Evaluation"]],
  ["sofie-jansen", "Sofie Jansen", "Growth for product-led SaaS - experiments, not opinions", "Amsterdam", "Netherlands", "NL", 4300, ["Growth / GTM", "SaaS", "B2B"], 19500, "PLG growth lead. I publish the experiments that failed too.", ["PLG", "Experimentation", "Activation"]],
  ["daniel-mwangi", "Daniel Mwangi", "Fintech product, payments rails and compliance in plain English", "Nairobi", "Kenya", "KE", 6700, ["Fintech", "B2B", "Productivity"], 24000, "Payments product manager. I explain the boring parts that cost you money.", ["Payments", "Compliance", "Product"]],
  ["clara-dubois", "Clara Dubois", "Outbound that people reply to. Mostly about sequences and sanity", "Paris", "France", "FR", 7900, ["Outreach", "Sales", "B2B"], 41000, "Sales leader. Fifteen years of cold outreach, still learning.", ["Outbound", "Sales Enablement", "CRM"]],
  ["ravi-menon", "Ravi Menon", "Data platforms, dbt and making analytics teams less miserable", "Bengaluru", "India", "IN", 5100, ["Data / Analytics", "Developer Tools", "B2B"], 22800, "Analytics engineer. I write about pipelines that do not page you at 3am.", ["dbt", "Warehousing", "Analytics Engineering"]],
  ["marta-nowak", "Marta Nowak", "Cybersecurity for teams that cannot afford a security team", "Warsaw", "Poland", "PL", 9100, ["Cybersecurity", "Software", "B2B"], 47000, "Security engineer. Practical threat modelling for small teams.", ["AppSec", "Threat Modelling", "Compliance"]],
  ["james-whitfield", "James Whitfield", "Content strategy for technical products. Words that sell software", "Manchester", "United Kingdom", "GB", 3800, ["Marketing", "B2B", "SaaS"], 16400, "Freelance content lead for developer-facing companies.", ["Content Strategy", "SEO", "Technical Writing"]],
  ["ines-navarro", "Ines Navarro", "Design systems, product design and shipping under constraint", "Barcelona", "Spain", "ES", 6400, ["Design", "Software", "Productivity"], 33000, "Product designer. I care about the states nobody designs.", ["Design Systems", "Figma", "Product Design"]],
  ["kwame-asante", "Kwame Asante", "E-commerce operations and the unglamorous side of DTC growth", "Accra", "Ghana", "GH", 4600, ["E-commerce", "B2C", "Growth / GTM"], 18900, "Ops lead for DTC brands. Margins over vanity metrics.", ["Supply Chain", "Retention", "Ops"]],
  ["hannah-mueller", "Hannah Mueller", "Customer success, churn forensics and renewal conversations", "Berlin", "Germany", "DE", 2900, ["Customer Support", "SaaS", "B2B"], 11200, "CS leader. I write post-mortems on churn nobody wants to read.", ["Retention", "Onboarding", "CS Ops"]],
  ["oliver-reid", "Oliver Reid", "SEO for software companies - programmatic, technical, unsexy", "Dublin", "Ireland", "IE", 8600, ["SEO", "Marketing", "B2B"], 39000, "SEO consultant. Fifteen years, mostly in B2B SaaS.", ["Technical SEO", "Programmatic SEO", "Content"]],
  ["yuki-tanaka", "Yuki Tanaka", "Product-led onboarding and the first ten minutes of any SaaS", "Tokyo", "Japan", "JP", 5900, ["SaaS", "Productivity", "Growth / GTM"], 26500, "Product manager. Obsessed with activation.", ["Onboarding", "Activation", "PM"]],
  ["elena-petrova", "Elena Petrova", "RevOps - the plumbing between marketing, sales and finance", "Sofia", "Bulgaria", "BG", 3400, ["CRM", "Sales", "B2B"], 14800, "RevOps consultant. Your CRM is lying to you.", ["RevOps", "Salesforce", "Attribution"]],
  ["marcus-lindqvist", "Marcus Lindqvist", "LegalTech, contracts and automating the parts lawyers hate", "Oslo", "Norway", "NO", 2400, ["LegalTech", "B2B", "Productivity"], 9600, "Lawyer turned product lead. Contract automation, mostly.", ["CLM", "Legal Ops", "Automation"]],
  ["priya-shah", "Priya Shah", "EdTech, learning design and why most corporate training fails", "Mumbai", "India", "IN", 4900, ["EdTech", "HR", "B2C"], 20700, "Learning designer. Evidence over engagement metrics.", ["Instructional Design", "L&D", "EdTech"]],
  ["ben-kaplan", "Ben Kaplan", "PropTech and the slow digitisation of commercial real estate", "New York", "United States", "US", 3100, ["Real Estate / PropTech", "B2B", "Fintech"], 12400, "PropTech operator. I write about an industry that fears spreadsheets.", ["PropTech", "CRE", "Ops"]],
  ["freya-andersen", "Freya Andersen", "Brand and creative for B2B companies that look like everyone else", "Copenhagen", "Denmark", "DK", 7200, ["Creative", "Marketing", "B2B"], 35800, "Creative director. B2B does not have to be beige.", ["Brand", "Creative Direction", "Positioning"]],
  ["carlos-mendes", "Carlos Mendes", "HealthTech, EHR integrations and interoperability that works", "Sao Paulo", "Brazil", "BR", 4100, ["HealthTech", "Software", "B2B"], 17600, "Health IT engineer. FHIR, HL7 and the reality in between.", ["FHIR", "Interoperability", "Health IT"]],
  ["nadia-haddad", "Nadia Haddad", "B2B partnerships and the channel nobody resources properly", "Dubai", "United Arab Emirates", "AE", 3600, ["B2B", "Sales", "Growth / GTM"], 15200, "Partnerships lead. Channel is a product problem.", ["Partnerships", "Channel", "Alliances"]],
  // --- no post history yet: these four show the dash, in the grid, on purpose
  ["samuel-adeyemi", "Samuel Adeyemi", "Platform engineering and the internal developer portal question", "Lagos", "Nigeria", "NG", 2100, ["Developer Tools", "Software", "Productivity"], null, "Platform engineer. New here, posting weekly.", ["Kubernetes", "IDP", "DevEx"]],
  ["mei-lin-chen", "Mei-Lin Chen", "AI product management - shipping models people actually trust", "Singapore", "Singapore", "SG", 2800, ["AI", "SaaS", "Productivity"], null, "AI PM. Just started writing publicly.", ["AI Product", "Trust & Safety", "PM"]],
  ["alex-novak", "Alex Novak", "Sales engineering, demos and technical discovery", "Prague", "Czechia", "CZ", 1900, ["Sales", "SaaS", "B2B"], null, "Sales engineer. First month on here.", ["Solutions Engineering", "Demos", "Discovery"]],
  ["laura-kelly", "Laura Kelly", "Marketing ops, attribution and the reporting nobody believes", "Toronto", "Canada", "CA", 2500, ["Marketing", "Data / Analytics", "B2B"], null, "Marketing ops manager. New to posting.", ["Attribution", "Martech", "Reporting"]],
].map(
  (r) =>
    ({
      slug: r[0], name: r[1], headline: r[2], city: r[3], country: r[4],
      cc: r[5], followers: r[6], industries: r[7], medianViews: r[8],
      about: r[9], skills: r[10],
    }) as Row,
) as unknown as Row[];


/**
 * Unclaimed on purpose.
 *
 * Every other profile here is claimed by a seeded creator, which means a fresh
 * signup could never hit the cache tier: dedupe would reject it first. These
 * three exist in the cache with no creator attached, so a signup on camera
 * resolves locally and deterministically, with no live call and no dependency
 * on the profile service being up. The seed skips them via `_unclaimed`.
 */
const UNCLAIMED: Row[] = [
  ["dana-whitmore", "Dana Whitmore", "Product marketing for developer platforms, and the positioning work nobody budgets for", "Berlin", "Germany", "DE", 6300, ["Marketing", "Developer Tools", "B2B"], null, "PMM for infrastructure products.", ["Positioning", "Messaging", "Launches"]],
  ["theo-brennan", "Theo Brennan", "Vertical SaaS operator writing about pricing, packaging and churn", "Dublin", "Ireland", "IE", 4700, ["SaaS", "B2B", "Fintech"], null, "Operator, two exits, still arguing about pricing.", ["Pricing", "Packaging", "Retention"]],
  ["sana-iqbal", "Sana Iqbal", "Applied AI for support teams - what deflects tickets and what annoys customers", "Karachi", "Pakistan", "PK", 5200, ["AI", "Customer Support", "SaaS"], null, "Support automation lead.", ["LLMs", "Deflection", "CX"]],
].map(
  (r) =>
    ({
      slug: r[0], name: r[1], headline: r[2], city: r[3], country: r[4],
      cc: r[5], followers: r[6], industries: r[7], medianViews: r[8],
      about: r[9], skills: r[10],
    }) as Row,
) as unknown as Row[];

/**
 * Illustrated, deterministic, and obviously not a photograph of a real person.
 *
 * The presentation is written down here rather than derived from the name at
 * render time. These are invented people and this file invents them, so
 * picking the portrait alongside the name is authorship; inferring a face from
 * a string of letters later would be a guess, and the wrong kind. The three
 * names that are genuinely ambiguous in English are left out of both lists and
 * get the androgynous pool, which is the honest answer for them.
 */
const PRESENTS_FEM = [
  "nina-costa", "amara-okafor", "sofie-jansen", "clara-dubois", "marta-nowak",
  "ines-navarro", "hannah-mueller", "elena-petrova", "priya-shah",
  "freya-andersen", "nadia-haddad", "mei-lin-chen", "laura-kelly", "sana-iqbal",
];

const PRESENTS_MASC = [
  "tomas-berg", "luca-ferrari", "daniel-mwangi", "ravi-menon",
  "james-whitfield", "kwame-asante", "oliver-reid", "marcus-lindqvist",
  "ben-kaplan", "carlos-mendes", "samuel-adeyemi", "theo-brennan",
];

/** Hair variants read off a contact sheet of all 63, not picked blind. */
const HAIR = {
  fem: [8, 23, 28, 36, 45, 47, 48, 57, 58, 59, 2, 13],
  masc: [1, 5, 7, 9, 16, 19, 25, 33, 34, 40, 49, 52, 55, 60],
  neutral: [21, 22, 26, 35, 42, 50, 53],
} as const;

function avatarFor(slug: string, order: number) {
  const femIndex = PRESENTS_FEM.indexOf(slug);
  const mascIndex = PRESENTS_MASC.indexOf(slug);
  const [group, i] =
    femIndex >= 0
      ? (["fem", femIndex] as const)
      : mascIndex >= 0
        ? (["masc", mascIndex] as const)
        : (["neutral", order] as const);

  const pool = HAIR[group];
  const hair = `variant${String(pool[i % pool.length]).padStart(2, "0")}`;
  const beard = group === "masc" && i % 3 === 0 ? 100 : 0;

  return (
    `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(slug)}` +
    `&hair=${hair}&beardProbability=${beard}` +
    `&backgroundColor=e8f0fe,f4f0e8,d7f2e9&size=256`
  );
}

const ALL = [...ROWS, ...UNCLAIMED];

const profiles = Object.fromEntries(
  ALL.map((r, order) => [
    r.slug,
    {
      // Shaped exactly like the live service's ProfileResponse, so tier 1 and
      // tier 2 of the importer parse the same thing and the demo cannot drift
      // from production. snake_case, nested profile, location as one string.
      source: "cache",
      fetched_at: "2026-09-11T00:00:00.000Z",
      meta: {
        source: "cache",
        fetched_at: "2026-09-11T00:00:00.000Z",
        request_id: `seed-${r.slug}`,
        duration_ms: 0,
        upstream_requests: 0,
        cache_age_seconds: null,
        fields: [
          "follower_count",
          "headline",
          "images",
          "location",
          "name",
          "public_identifier",
        ],
        quota_remaining: null,
      },
      profile: {
        public_identifier: r.slug,
        name: r.name,
        headline: r.headline,
        follower_count: r.followers,
        location: `${r.city}, ${r.country}`,
        images: { profile_picture: avatarFor(r.slug, order), background_picture: null },
      },
      limitations: [],
      // Seed-only. The importer strips underscore keys before storing, and the
      // seed uses these to decide history and what to leave unclaimed.
      _seedMedianViews: r.medianViews,
      _seedIndustries: r.industries,
      _unclaimed: UNCLAIMED.some((u) => u.slug === r.slug) || undefined,
    },
  ]),
);

const outDir = join(process.cwd(), "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "cached-profiles.json"),
  JSON.stringify(profiles, null, 2) + "\n",
);
console.log(
  `wrote data/cached-profiles.json with ${ALL.length} profiles ` +
    `(${UNCLAIMED.length} left unclaimed for signup demos)`,
);
