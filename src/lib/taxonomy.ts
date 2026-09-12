/**
 * The vocabulary both sides pick from.
 *
 * Plain constants in their own module because client components need them:
 * the campaign form and the creator's card step both render these as chips,
 * and lib/queries.ts is server-only, so importing from there dragged Prisma
 * into the browser bundle.
 */

/** Every industry chip offered during creator onboarding, in recon order. */
export const INDUSTRIES = [
  "B2B", "B2C", "AI", "SaaS", "Software", "Sales", "Marketing", "SEO",
  "Outreach", "CRM", "Creative", "Productivity", "Fintech", "HealthTech",
  "EdTech", "Cybersecurity", "Growth / GTM", "HR", "E-commerce",
  "Developer Tools", "Data / Analytics", "Customer Support", "Design",
  "Real Estate / PropTech", "LegalTech",
] as const;

export const MAX_INDUSTRIES = 3;

/** The regions a campaign can target. The matcher scores against these. */
export const REGIONS = [
  "Europe", "North America", "Latin America", "Africa",
  "Middle East", "Asia", "Oceania",
] as const;
