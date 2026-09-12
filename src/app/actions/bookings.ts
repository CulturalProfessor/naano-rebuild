"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import type { ActionState } from "./offers";

/**
 * What happens after acceptance.
 *
 * The creator publishes and tells us where; from that moment the tracking code
 * they were given at acceptance starts resolving clicks back to this one
 * booking. Views are the creator's own number and are labelled as such
 * everywhere they appear, because we do not read LinkedIn.
 */

/** A post URL has to be a LinkedIn URL, or the link on the card is a lie. */
function normalizePostUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
  url.hash = "";
  return url.toString();
}

export async function submitPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();
  const bookingId = String(formData.get("bookingId") ?? "");
  const postUrl = normalizePostUrl(String(formData.get("postUrl") ?? ""));

  if (!postUrl) {
    return { error: "Paste the public LinkedIn URL of the post." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, creatorId: creator.id },
    select: { id: true, status: true },
  });
  if (!booking) return { error: "That booking is not yours." };
  if (booking.status !== "accepted" && booking.status !== "posted") {
    return { error: `This booking is ${booking.status} and cannot take a post URL.` };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { postUrl, postedAt: new Date(), status: "posted" },
  });

  revalidatePath(`/creator/bookings/${booking.id}`);
  revalidatePath("/creator");
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: "Post recorded. Your tracking link is live." };
}

/**
 * Views are self-reported. We say so on every screen that shows the number,
 * rather than presenting the creator's figure as something we measured.
 */
export async function reportViews(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();
  const bookingId = String(formData.get("bookingId") ?? "");
  const views = Number(formData.get("views"));

  if (!Number.isFinite(views) || views < 0 || views > 50_000_000) {
    return { error: "Enter the view count shown on your post." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, creatorId: creator.id },
    select: { id: true, postUrl: true },
  });
  if (!booking) return { error: "That booking is not yours." };
  if (!booking.postUrl) return { error: "Add the post URL first." };

  await prisma.booking.update({
    where: { id: booking.id },
    data: { selfReportedViews: Math.round(views) },
  });

  revalidatePath(`/creator/bookings/${booking.id}`);
  revalidatePath(`/brand/bookings/${booking.id}`);
  return { ok: "Updated." };
}
