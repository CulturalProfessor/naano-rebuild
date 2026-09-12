import "server-only";
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

/** Every booking this party is on that could carry a conversation. */
export async function threadsFor(party: Party, partyId: string) {
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
}

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

/** The header badge. One count, both sides, same rule as the list. */
export async function unreadCountFor(party: Party, partyId: string) {
  const threads = await threadsFor(party, partyId);
  return threads.filter((t) => t.unread).length;
}

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
  const threads = await threadsFor(party, partyId);
  const id = requested && threads.some((t) => t.id === requested)
    ? requested
    : threads[0]?.id;
  if (id) await markThreadRead(party, partyId, id);
  return id;
}
