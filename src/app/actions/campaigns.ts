"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireBrand } from "@/lib/auth";
import { INDUSTRIES, REGIONS, MAX_INDUSTRIES } from "@/lib/queries";
import type { ActionState } from "./offers";

/**
 * Campaign create and edit.
 *
 * Onboarding produces the first campaign as a side effect of signing up, which
 * is the right shape for arrival but left a brand with no way to run a second
 * one, or to correct a brief after sending an offer against it. Both go
 * through here.
 *
 * There is no delete. A campaign is the parent of offers, bookings, clicks,
 * leads and ledger rows, so removing one would either orphan a paid booking or
 * quietly delete a creator's earnings. Closing is the verb that exists, and
 * the UI says why.
 */

function readForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const briefProduct = String(formData.get("briefProduct") ?? "").trim();
  const briefAudience = String(formData.get("briefAudience") ?? "").trim();

  const industries = formData
    .getAll("industries")
    .map(String)
    .filter((i) => (INDUSTRIES as readonly string[]).includes(i))
    .slice(0, MAX_INDUSTRIES);

  const regions = formData
    .getAll("regions")
    .map(String)
    .filter((r) => (REGIONS as readonly string[]).includes(r));

  const budgetEuros = Number(formData.get("budgetCap"));
  const dealEuros = Number(formData.get("dealValue"));
  const deadlineDays = Number(formData.get("postDeadlineDays"));

  return {
    name,
    briefProduct,
    briefAudience,
    industries,
    regions,
    budgetCapCents:
      Number.isFinite(budgetEuros) && budgetEuros > 0
        ? Math.round(budgetEuros * 100)
        : null,
    assumedDealValueCents:
      Number.isFinite(dealEuros) && dealEuros > 0
        ? Math.round(dealEuros * 100)
        : 500_000,
    postDeadlineDays:
      Number.isFinite(deadlineDays) && deadlineDays >= 1 && deadlineDays <= 90
        ? Math.round(deadlineDays)
        : 14,
  };
}

export async function saveCampaign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { brand } = await requireBrand();
  const id = String(formData.get("campaignId") ?? "").trim() || null;
  const data = readForm(formData);

  if (!data.name) return { error: "Give the campaign a name." };
  if (data.briefProduct.length < 20) {
    return {
      error:
        "The product line is what every creator writes from, and what the matcher scores against. Give it a sentence or two.",
    };
  }
  if (!data.briefAudience) {
    return { error: "Name who this is for. It becomes the audience line in the brief." };
  }
  if (data.regions.length === 0) {
    return { error: "Pick at least one region, or no creator can match it." };
  }

  let campaignId: string;
  if (id) {
    // The brand id is in the where clause, not checked afterwards: a forged
    // campaign id resolves to nothing rather than to someone else's brief.
    const updated = await prisma.campaign.updateMany({
      where: { id, brandId: brand.id },
      data,
    });
    if (updated.count === 0) return { error: "That campaign is not yours." };
    campaignId = id;
  } else {
    const created = await prisma.campaign.create({
      data: { brandId: brand.id, ...data, status: "open" },
      select: { id: true },
    });
    campaignId = created.id;
  }

  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  revalidatePath(`/brand/campaigns/${campaignId}`);
  revalidatePath("/brand/matching");
  redirect(`/brand/campaigns/${campaignId}`);
}

/** Open or close. Closing hides it from Opportunities and from new offers. */
export async function setCampaignStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { brand } = await requireBrand();
  const id = String(formData.get("campaignId") ?? "");
  const next = String(formData.get("status") ?? "");
  if (next !== "open" && next !== "closed") return { error: "Unknown status." };

  const updated = await prisma.campaign.updateMany({
    where: { id, brandId: brand.id },
    data: { status: next },
  });
  if (updated.count === 0) return { error: "That campaign is not yours." };

  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  revalidatePath(`/brand/campaigns/${id}`);
  return {
    ok:
      next === "closed"
        ? "Closed. It no longer appears in Opportunities and takes no new offers. Existing bookings carry on."
        : "Open again. Creators can apply and you can send offers against it.",
  };
}
