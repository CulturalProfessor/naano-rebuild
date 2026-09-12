"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/auth";
import { INDUSTRIES } from "@/lib/queries";

/**
 * Brand step 2. Signup produces the first campaign as a side effect, which is
 * how the reference product works: the post-signup URL carries a campaign id
 * before the brand has done anything. A brand that lands on an empty dashboard
 * has been handed a directory; one that lands on a campaign with a brief has
 * been handed a product.
 *
 * The value proposition and ICPs are written by the brand here. In the
 * reference they are generated and handed over for approval; that generation is
 * the part this build leaves out, not the object it produces.
 */
export async function saveBrandProfile(formData: FormData) {
  const account = await requireAccount();
  if (account.role !== "brand") redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;
  const valueProposition = String(formData.get("valueProposition") ?? "").trim();

  if (!name) redirect("/onboarding/brand?error=name");

  const icps = [0, 1, 2]
    .map((i) => ({
      title: String(formData.get(`icp${i}Title`) ?? "").trim(),
      description: String(formData.get(`icp${i}Desc`) ?? "").trim(),
    }))
    .filter((i) => i.title);

  const industries = formData
    .getAll("industries")
    .map(String)
    .filter((i) => (INDUSTRIES as readonly string[]).includes(i));

  const budgetEuros = Number(formData.get("budgetCap"));
  const dealValueEuros = Number(formData.get("dealValue"));

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "brand";

  // Two brands may well pick the same name. The slug is ours, so make it unique
  // rather than failing a signup on someone else's choice.
  let slug = slugBase;
  for (let n = 2; ; n++) {
    const taken = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${slugBase}-${n}`;
  }

  const brand = await prisma.brand.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      name,
      slug,
      website,
      valueProposition,
      icps,
    },
    update: { name, website, valueProposition, icps },
  });

  const existing = await prisma.campaign.findFirst({
    where: { brandId: brand.id },
    select: { id: true },
  });

  const campaignData = {
    name: "Main campaign",
    briefProduct: valueProposition || `${name} is a B2B product.`,
    briefAudience: icps.map((i) => i.title).join(" · ") || "B2B buyers",
    industries,
    regions: ["Europe", "North America"],
    budgetCapCents: Number.isFinite(budgetEuros) && budgetEuros > 0
      ? Math.round(budgetEuros * 100)
      : null,
    // Estimated pipeline is lead count times this, and the dashboard shows the
    // multiplier next to the total. A brand that does not state one keeps the
    // default, and the default is shown too.
    ...(Number.isFinite(dealValueEuros) && dealValueEuros > 0
      ? { assumedDealValueCents: Math.round(dealValueEuros * 100) }
      : {}),
    status: "open" as const,
  };

  if (existing) {
    await prisma.campaign.update({ where: { id: existing.id }, data: campaignData });
  } else {
    await prisma.campaign.create({ data: { brandId: brand.id, ...campaignData } });
    // Play money so the wallet is not empty on arrival. No Stripe in this build.
    await prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        direction: "credit",
        amountCents: 1_000_000,
        kind: "wallet_topup",
        memo: "Demo opening balance",
      },
    });
  }

  redirect("/brand");
}
