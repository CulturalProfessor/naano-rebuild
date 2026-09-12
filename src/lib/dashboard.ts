import "server-only";
import { prisma } from "./db";
import { metricOf, pending, type Metric } from "./pricing";

/**
 * The campaign dashboard.
 *
 * Three kinds of number live here and the UI has to keep them apart, because
 * the difference is the honest part of the product:
 *
 *   measured   clicks and leads, counted by us through the tracking link
 *   reported   views, typed in by the creator off LinkedIn
 *   assumed    estimated pipeline, lead count times a number the brand stated
 *
 * Anything with no denominator comes back as a pending Metric rather than a
 * zero, so the dash rule is enforced here rather than remembered in each view.
 */

export type PostRow = {
  bookingId: string;
  creatorName: string;
  creatorSlug: string;
  avatarUrl: string | null;
  status: string;
  costCents: number;
  postUrl: string | null;
  views: Metric;
  clicks: Metric;
  leads: Metric;
  cpmCents: Metric;
  cplCents: Metric;
};

export async function campaignDashboard(brandId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId },
    select: {
      id: true,
      name: true,
      briefProduct: true,
      briefAudience: true,
      briefGuardrail: true,
      regions: true,
      industries: true,
      budgetCapCents: true,
      assumedDealValueCents: true,
      status: true,
    },
  });
  if (!campaign) return null;

  const bookings = await prisma.booking.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      agreedPriceCents: true,
      postUrl: true,
      selfReportedViews: true,
      creator: { select: { displayName: true, urlSlug: true, avatarUrl: true } },
      _count: { select: { clicks: true, leads: true } },
    },
  });

  const posts: PostRow[] = bookings.map((b) => {
    // Before a post exists there is nothing to measure, so clicks and leads are
    // unknown rather than zero. After it exists, zero is a real measurement.
    const live = b.postUrl !== null;
    const clicks = live ? metricOf(b._count.clicks) : pending();
    const leads = live ? metricOf(b._count.leads) : pending();
    const views = metricOf(b.selfReportedViews);

    return {
      bookingId: b.id,
      creatorName: b.creator.displayName,
      creatorSlug: b.creator.urlSlug,
      avatarUrl: b.creator.avatarUrl,
      status: b.status,
      costCents: b.agreedPriceCents,
      postUrl: b.postUrl,
      views,
      clicks,
      leads,
      cpmCents: views.known && views.value > 0
        ? { known: true as const, value: Math.round((b.agreedPriceCents / views.value) * 1000) }
        : pending(),
      cplCents: leads.known && leads.value > 0
        ? { known: true as const, value: Math.round(b.agreedPriceCents / leads.value) }
        : pending(),
    };
  });

  const posted = posts.filter((p) => p.postUrl !== null);
  const reportedViews = posts.filter((p) => p.views.known);

  const costCents = posts.reduce((sum, p) => sum + p.costCents, 0);
  const clicks = posted.reduce(
    (sum, p) => sum + (p.clicks.known ? p.clicks.value : 0),
    0,
  );
  const leads = posted.reduce(
    (sum, p) => sum + (p.leads.known ? p.leads.value : 0),
    0,
  );
  const views = reportedViews.reduce(
    (sum, p) => sum + (p.views.known ? p.views.value : 0),
    0,
  );

  // Pipeline is summed off the Lead rows rather than recomputed, because each
  // lead froze the assumption that was current when it arrived.
  const pipeline = await prisma.lead.aggregate({
    where: { campaignId: campaign.id },
    _sum: { pipelineValueCents: true },
  });

  return {
    campaign,
    posts,
    totals: {
      bookings: posts.length,
      livePosts: posted.length,
      costCents,
      clicks: posted.length > 0 ? metricOf(clicks) : pending(),
      leads: posted.length > 0 ? metricOf(leads) : pending(),
      // A partial sum is still a real sum, but the UI has to say how partial.
      views: reportedViews.length > 0 ? metricOf(views) : pending(),
      viewsReportedBy: reportedViews.length,
      pipelineCents: leads > 0 ? metricOf(pipeline._sum.pipelineValueCents ?? 0) : pending(),
      cpmCents:
        views > 0 ? metricOf(Math.round((costCents / views) * 1000)) : pending(),
      cplCents: leads > 0 ? metricOf(Math.round(costCents / leads)) : pending(),
    },
  };
}

export type CampaignDashboard = NonNullable<
  Awaited<ReturnType<typeof campaignDashboard>>
>;
