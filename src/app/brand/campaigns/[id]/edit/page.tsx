import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBrand } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CampaignForm } from "@/components/campaign-form";

export const metadata = { title: "Edit the brief · naano" };

export default async function EditCampaign({
  params,
}: PageProps<"/brand/campaigns/[id]/edit">) {
  const { brand } = await requireBrand();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, brandId: brand.id },
    select: {
      id: true,
      name: true,
      briefProduct: true,
      briefAudience: true,
      industries: true,
      regions: true,
      budgetCapCents: true,
      assumedDealValueCents: true,
      postDeadlineDays: true,
      _count: { select: { offers: true, bookings: true } },
    },
  });
  if (!campaign) notFound();

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href={`/brand/campaigns/${campaign.id}`}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← Back to the dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl">Edit the brief</h1>

        {campaign._count.bookings > 0 ? (
          <p className="mt-3 rounded-card border border-line bg-surface-3 px-4 py-3 text-sm text-ink-soft">
            {campaign._count.bookings} booking
            {campaign._count.bookings === 1 ? " was" : "s were"} agreed against
            the current brief. Changing it here changes what the next creator
            reads, not what anyone already accepted: an agreed price and
            deadline are frozen on the booking.
          </p>
        ) : null}

        <div className="mt-8">
          <CampaignForm
            cancelHref={`/brand/campaigns/${campaign.id}`}
            draft={{
              id: campaign.id,
              name: campaign.name,
              briefProduct: campaign.briefProduct,
              briefAudience: campaign.briefAudience,
              industries: campaign.industries,
              regions: campaign.regions,
              budgetCapEuros:
                campaign.budgetCapCents != null
                  ? String(campaign.budgetCapCents / 100)
                  : "",
              dealValueEuros: String(campaign.assumedDealValueCents / 100),
              postDeadlineDays: campaign.postDeadlineDays,
            }}
          />
        </div>
      </main>
    </>
  );
}
