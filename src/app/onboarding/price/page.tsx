import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PriceForm } from "./price-form";

export const metadata = { title: "Set your price · naano" };

export default async function PriceStepPage() {
  const account = await requireAccount();
  if (account.role !== "creator") redirect("/brand");

  const creator = await prisma.creator.findUnique({
    where: { accountId: account.id },
  });
  if (!creator) redirect("/onboarding/profile");

  return (
    <PriceForm
      recommendedCents={creator.pricePerPostCents}
      avatarUrl={creator.avatarUrl}
      followerCount={creator.followerCount}
      base={{
        displayName: creator.displayName,
        headline: creator.headline,
        avatarUrl: creator.avatarUrl,
        country: creator.country,
        countryCode: creator.countryCode,
        industries: creator.industries,
        followerCount: creator.followerCount,
        medianViews: creator.medianViews,
        pricePerPostCents: creator.pricePerPostCents,
        dataState: creator.dataState,
        bundle: null,
      }}
    />
  );
}
