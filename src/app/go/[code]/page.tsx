import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LeadForm } from "./lead-form";

/**
 * The campaign landing page a tracking link lands on.
 *
 * It is naano's page, not the brand's, which is what makes the lead
 * attributable: the visitor never leaves a surface we can measure. The line
 * naming the creator is deliberate. Someone who followed a link out of a post
 * should be able to see who sent them, and a brand should see that we know.
 */

export const dynamic = "force-dynamic";

export default async function LandingPage({ params }: PageProps<"/go/[code]">) {
  const { code } = await params;

  const booking = await prisma.booking.findUnique({
    where: { trackingCode: code },
    select: {
      id: true,
      creator: { select: { displayName: true, urlSlug: true, avatarUrl: true } },
      brand: { select: { name: true, website: true, valueProposition: true } },
      campaign: {
        select: {
          name: true,
          briefProduct: true,
          briefAudience: true,
        },
      },
    },
  });
  if (!booking) notFound();

  return (
    <main className="sky-bg grain min-h-screen">
      <div className="relative z-10 mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            {booking.brand.name}
          </p>
          <h1 className="mt-3 font-display text-4xl">
            {booking.campaign.briefProduct.split(".")[0]}.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            {booking.brand.valueProposition ?? booking.campaign.briefProduct}
          </p>

          <div className="mt-8 rounded-panel border border-line bg-surface/80 p-5 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
              Built for
            </p>
            <p className="mt-1">{booking.campaign.briefAudience}</p>
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm text-ink-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3">
              {booking.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.creator.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                booking.creator.displayName.slice(0, 1)
              )}
            </span>
            <p>
              You came here from{" "}
              <Link
                href={`/c/${booking.creator.urlSlug}`}
                className="font-medium text-ink hover:text-brand"
              >
                {booking.creator.displayName}
              </Link>
              &apos;s post. naano counted that click for them, and will count
              this form if you fill it in.
            </p>
          </div>
        </div>

        <aside className="h-fit rounded-hero bg-surface p-6 shadow-[var(--shadow-hero)]">
          <h2 className="font-display text-xl">Talk to {booking.brand.name}</h2>
          <p className="mb-5 mt-1 text-sm text-ink-soft">
            Leave a work email and someone will follow up.
          </p>
          <LeadForm code={code} />
        </aside>
      </div>
    </main>
  );
}
