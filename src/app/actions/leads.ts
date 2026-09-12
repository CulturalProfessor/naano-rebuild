"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * The lead form on the campaign landing page.
 *
 * No session here: the person filling this in is a stranger who clicked a link
 * in a LinkedIn post, which is exactly the point. The tracking code is the only
 * thing that ties them to a creator, and it came from the URL they followed.
 */

export type LeadState = { error?: string; ok?: string } | null;

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const code = String(formData.get("code") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim() || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "That does not look like a work email address." };
  }

  const booking = await prisma.booking.findUnique({
    where: { trackingCode: code },
    select: {
      id: true,
      campaignId: true,
      campaign: { select: { assumedDealValueCents: true } },
    },
  });
  if (!booking) return { error: "That link is no longer active." };

  // One person, one lead per post. A refresh and a second submit is the same
  // interest, and counting it twice would inflate the number this whole chain
  // exists to make trustworthy.
  const existing = await prisma.lead.findFirst({
    where: { bookingId: booking.id, email },
    select: { id: true },
  });
  if (existing) {
    return { ok: "You are already on the list. Someone will be in touch." };
  }

  await prisma.lead.create({
    data: {
      bookingId: booking.id,
      campaignId: booking.campaignId,
      trackingCode: code,
      email,
      company,
      // Frozen at the campaign's stated assumption, so a brand that changes the
      // assumption later does not silently rewrite the pipeline it already
      // reported. The multiplier is shown next to every total it feeds.
      pipelineValueCents: booking.campaign.assumedDealValueCents,
    },
  });

  revalidatePath(`/brand/bookings/${booking.id}`);
  revalidatePath(`/creator/bookings/${booking.id}`);
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: "Thanks. The team will be in touch." };
}
