import "server-only";
import { cache } from "react";
import { prisma } from "./db";

/**
 * Threads.
 *
 * A message only exists inside a booking both sides already agreed to. That is
 * the whole access model: if you are the brand or the creator on the booking,
 * you are in the thread, and there is nobody else to address. No contacts, no
 * block list, no spam surface, and no empty inbox for a stranger who has not
 * booked anything yet.
 *
 * Unread is a comparison, not a flag: their messages newer than my read mark.
 * Two writers on one boolean per message is how unread counts drift.
 */

export type Party = "brand" | "creator";

const THREAD_SELECT = {
  id: true,
  status: true,
  agreedPriceCents: true,
  postBy: true,
  brandReadAt: true,
  creatorReadAt: true,
  campaign: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true, accountId: true } },
  creator: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      urlSlug: true,
      accountId: true,
    },
  },
} as const;

/**
 * Every booking this party is on that could carry a conversation.
 *
 * Cached per request: the messages screen and its list both want it, and this
 * is the heaviest query in the app, one row per booking with its last message.
 */
export const threadsFor = cache(async (party: Party, partyId: string) => {
  const bookings = await prisma.booking.findMany({
    where: party === "brand" ? { brandId: partyId } : { creatorId: partyId },
    orderBy: { createdAt: "desc" },
    select: {
      ...THREAD_SELECT,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderRole: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return bookings.map((b) => {
    const mark = party === "brand" ? b.brandReadAt : b.creatorReadAt;
    const last = b.messages[0] ?? null;
    // Only the other side's messages can be unread, and only past the mark.
    const unread =
      last && last.senderRole !== party && (!mark || last.createdAt > mark);
    return { ...b, last, unread: Boolean(unread), messageCount: b._count.messages };
  });
});

export type ThreadSummary = Awaited<ReturnType<typeof threadsFor>>[number];

/**
 * One thread, scoped by the party asking for it. The party id is part of the
 * where clause rather than checked after the read, so a wrong id returns
 * nothing instead of returning someone else's conversation.
 */
export async function threadFor(
  party: Party,
  partyId: string,
  bookingId: string,
) {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      ...(party === "brand" ? { brandId: partyId } : { creatorId: partyId }),
    },
    select: {
      ...THREAD_SELECT,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, senderRole: true, createdAt: true },
      },
    },
  });
  return booking;
}

/** Called when a thread is opened, so the badge clears by being read. */
export async function markThreadRead(
  party: Party,
  partyId: string,
  bookingId: string,
) {
  await prisma.booking.updateMany({
    where: {
      id: bookingId,
      ...(party === "brand" ? { brandId: partyId } : { creatorId: partyId }),
    },
    data:
      party === "brand" ? { brandReadAt: new Date() } : { creatorReadAt: new Date() },
  });
}

/**
 * The header badge, on every signed-in page.
 *
 * A count, not a list. The read mark lives on the booking row and the messages
 * live on another table, so "threads with something new for me" is one EXISTS
 * against the (bookingId, createdAt) index rather than loading every booking
 * and its last message to throw all of it away. That is what the badge used to
 * do, on every single page render.
 *
 * It also reads slightly better than what it replaced: a thread counts as
 * unread when anything of theirs arrived after I last looked, rather than only
 * when the very last message happens to be theirs.
 */
export const unreadCountFor = cache(async (party: Party, partyId: string) => {
  // Two branches rather than interpolated identifiers: a tagged template can
  // parameterise values, not column names, and building those by hand is how
  // an injection gets in. The literals here are ours, not anyone's input.
  const rows =
    party === "brand"
      ? await prisma.$queryRaw<{ n: bigint }[]>`
          SELECT count(*)::bigint AS n FROM bookings b
          WHERE b."brandId" = ${partyId}
            AND EXISTS (
              SELECT 1 FROM messages m
              WHERE m."bookingId" = b.id
                AND m."senderRole" = 'creator'::"Role"
                AND (b."brandReadAt" IS NULL OR m."createdAt" > b."brandReadAt")
            )`
      : await prisma.$queryRaw<{ n: bigint }[]>`
          SELECT count(*)::bigint AS n FROM bookings b
          WHERE b."creatorId" = ${partyId}
            AND EXISTS (
              SELECT 1 FROM messages m
              WHERE m."bookingId" = b.id
                AND m."senderRole" = 'brand'::"Role"
                AND (b."creatorReadAt" IS NULL OR m."createdAt" > b."creatorReadAt")
            )`;

  return Number(rows[0]?.n ?? 0);
});

/**
 * Pick the thread to show and clear its badge, in that order.
 *
 * Called by the page before it renders anything, because the header's unread
 * count is a query of its own: mark the thread read inside the screen
 * component and the badge stays lit for one more navigation.
 */
export async function openThread(
  party: Party,
  partyId: string,
  requested?: string,
) {
  const where = party === "brand" ? { brandId: partyId } : { creatorId: partyId };
  const booking = await prisma.booking.findFirst({
    where: requested ? { ...where, id: requested } : where,
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (booking) await markThreadRead(party, partyId, booking.id);
  return booking?.id;
}
