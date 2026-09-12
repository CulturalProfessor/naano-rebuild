"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBrand, requireCreator } from "@/lib/auth";
import { INDUSTRIES, MAX_INDUSTRIES } from "@/lib/taxonomy";
import { derivePricePerPostCents } from "@/lib/pricing";
import type { ActionState } from "./offers";

/**
 * The settings both sides were missing.
 *
 * Onboarding wrote these values once and there was no way back to them, so a
 * creator who mistyped their headline or wanted a different price was stuck
 * with it, and a brand could not correct its own company name.
 *
 * What is deliberately not editable: follower count, the LinkedIn URL and the
 * display name. Those came from the profile read and changing them by hand
 * would make the provenance line on the public card a lie.
 */

export async function saveBrandAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { brand } = await requireBrand();

  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;
  const valueProposition =
    String(formData.get("valueProposition") ?? "").trim() || null;

  if (!name) return { error: "A company name is needed. Creators see it on every offer." };

  const icps = [0, 1, 2]
    .map((i) => ({
      title: String(formData.get(`icp${i}Title`) ?? "").trim(),
      description: String(formData.get(`icp${i}Desc`) ?? "").trim(),
    }))
    .filter((i) => i.title);

  await prisma.brand.update({
    where: { id: brand.id },
    data: { name, website, valueProposition, icps },
  });

  revalidatePath("/brand");
  revalidatePath("/brand/account");
  return { ok: "Saved." };
}

export async function saveCreatorAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();

  const row = await prisma.creator.findUniqueOrThrow({
    where: { id: creator.id },
    select: { followerCount: true },
  });

  const headline = String(formData.get("headline") ?? "").trim() || null;
  const industries = formData
    .getAll("industries")
    .map(String)
    .filter((i) => (INDUSTRIES as readonly string[]).includes(i))
    .slice(0, MAX_INDUSTRIES);

  const priceEuros = Number(formData.get("pricePerPost"));
  if (!Number.isFinite(priceEuros) || priceEuros <= 0) {
    return { error: "Give a price above zero." };
  }
  const pricePerPostCents = Math.round(priceEuros * 100);

  // A price nobody would pay is worse for the creator than a low one, and a
  // price far under the derived figure usually means a typo, not an offer.
  const derived = derivePricePerPostCents(row.followerCount);
  if (pricePerPostCents > derived * 6) {
    return {
      error: `That is more than six times what your audience derives to (${Math.round(derived / 100)} euros). Brands filter on price, so a card that far out stops appearing.`,
    };
  }

  const live = formData.get("cardStatus") === "live";

  // The bundle is optional and lives on its own row, so an empty pair removes
  // it rather than writing a zero-post bundle nobody can book.
  const bundleCount = Number(formData.get("bundleCount"));
  const bundleTotal = Number(formData.get("bundleTotal"));
  const wantsBundle =
    Number.isFinite(bundleCount) &&
    bundleCount >= 2 &&
    Number.isFinite(bundleTotal) &&
    bundleTotal > 0;

  await prisma.$transaction(async (tx) => {
    await tx.creator.update({
      where: { id: creator.id },
      data: {
        headline,
        industries,
        pricePerPostCents,
        cardStatus: live ? "live" : "draft",
      },
    });

    await tx.bundle.deleteMany({ where: { creatorId: creator.id } });
    if (wantsBundle) {
      await tx.bundle.create({
        data: {
          creatorId: creator.id,
          postCount: Math.round(bundleCount),
          totalPriceCents: Math.round(bundleTotal * 100),
          isPrimary: true,
        },
      });
    }
  });

  revalidatePath("/creator");
  revalidatePath("/creator/account");
  revalidatePath("/marketplace");
  return {
    ok: live
      ? "Saved. Your card is live in the marketplace."
      : "Saved. Your card is hidden from the marketplace until you set it live.",
  };
}
