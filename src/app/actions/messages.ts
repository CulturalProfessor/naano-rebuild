"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/auth";
import type { ActionState } from "./offers";

const MAX_BODY = 2000;

/**
 * Send one message into a booking's thread.
 *
 * The booking is looked up by id AND by the sender's own party id in the same
 * where clause, so a forged booking id resolves to nothing rather than to
 * someone else's deal. Server Functions are reachable by direct POST, not only
 * through our own UI.
 */
export async function sendMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireAccount();
  const bookingId = String(formData.get("bookingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Write something first." };
  if (body.length > MAX_BODY) {
    return { error: `Keep it under ${MAX_BODY} characters.` };
  }

  const party = account.role === "brand" ? "brand" : "creator";
  const partyId = party === "brand" ? account.brand?.id : account.creator?.id;
  if (!partyId) return { error: "Your account is not set up yet." };

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      ...(party === "brand" ? { brandId: partyId } : { creatorId: partyId }),
    },
    select: { id: true },
  });
  if (!booking) return { error: "That booking is not yours." };

  await prisma.$transaction([
    prisma.message.create({
      data: {
        bookingId: booking.id,
        accountId: account.id,
        senderRole: account.role,
        body,
      },
    }),
    // Sending is reading: the sender has by definition seen the thread.
    prisma.booking.update({
      where: { id: booking.id },
      data:
        party === "brand"
          ? { brandReadAt: new Date() }
          : { creatorReadAt: new Date() },
    }),
  ]);

  revalidatePath(party === "brand" ? "/brand/messages" : "/creator/messages");
  revalidatePath(`/${party}/bookings/${booking.id}`);
  return { ok: "Sent." };
}
