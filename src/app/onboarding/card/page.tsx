import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INDUSTRIES, MAX_INDUSTRIES } from "@/lib/queries";
import { CardStep } from "./card-step";

export const metadata = { title: "Complete your creator card · naano" };

export default async function CardStepPage() {
  const account = await requireAccount();
  if (account.role !== "creator") redirect("/brand");

  const creator = await prisma.creator.findUnique({
    where: { accountId: account.id },
  });
  if (!creator) redirect("/onboarding/profile");

  return (
    <CardStep
      industries={INDUSTRIES}
      max={MAX_INDUSTRIES}
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
