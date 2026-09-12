import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { CampaignForm } from "@/components/campaign-form";

export const metadata = { title: "New campaign — naano" };

export default async function NewCampaign() {
  const { account } = await requireBrand();

  return (
    <>
      <AppHeader accountId={account.id} role="brand" active="/brand/campaigns" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href="/brand/campaigns"
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← Back to campaigns
        </Link>
        <h1 className="mt-3 font-display text-3xl">New campaign</h1>
        <p className="mt-1 text-ink-soft">
          A campaign is a brief plus a budget. Offers, bookings and every number
          on the dashboard hang off it.
        </p>

        <div className="mt-8">
          <CampaignForm
            cancelHref="/brand/campaigns"
            draft={{
              name: "",
              briefProduct: "",
              briefAudience: "",
              industries: [],
              regions: ["Europe", "North America"],
              budgetCapEuros: "",
              dealValueEuros: "5000",
              postDeadlineDays: 14,
            }}
          />
        </div>
      </main>
    </>
  );
}
