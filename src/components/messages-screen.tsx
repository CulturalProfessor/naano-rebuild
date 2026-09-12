import Link from "next/link";
import { MessageThread } from "@/components/message-thread";
import { threadsFor, threadFor, type Party } from "@/lib/messages";
import { formatDay, formatDayTime } from "@/lib/dates";
import { formatEuros } from "@/lib/pricing";

/**
 * The messages screen, one implementation for both sides.
 *
 * A thread is a booking, so the list is the bookings list seen through the
 * conversation rather than a separate object. That is why there is no "new
 * message" button: you cannot start a conversation with someone you have not
 * booked, and inventing an inbox that says otherwise would be a worse lie than
 * an empty one.
 */
export async function MessagesScreen({
  party,
  partyId,
  basePath,
  selectedId,
}: {
  party: Party;
  partyId: string;
  /** "/brand/messages" or "/creator/messages" */
  basePath: string;
  selectedId?: string;
}) {
  // Already marked read by the page, so the header's badge is current.
  const threads = await threadsFor(party, partyId);
  const active = selectedId ?? threads[0]?.id;
  const thread = active ? await threadFor(party, partyId, active) : null;

  const nameOf = (t: { brand: { name: string }; creator: { displayName: string } }) =>
    party === "brand" ? t.creator.displayName : t.brand.name;

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* the list */}
      <aside className="rounded-panel border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Conversations
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            One per booking. A thread opens the moment an offer is accepted.
          </p>
        </div>

        {threads.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-soft">
            {party === "brand"
              ? "No bookings yet, so no threads. Send an offer and this fills in."
              : "No bookings yet, so no threads. Accept an offer and this fills in."}
          </p>
        ) : (
          <ul className="max-h-[32rem] overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`${basePath}?booking=${t.id}`}
                  className={`block border-b border-line px-5 py-3.5 transition-colors last:border-0 ${
                    t.id === active ? "bg-brand-soft/60" : "hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{nameOf(t)}</span>
                    {t.unread && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-brand"
                        title="Unread"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-soft">
                    {t.campaign.name} · {formatEuros(t.agreedPriceCents)}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-mute">
                    {t.last
                      ? `${t.last.senderRole === party ? "You: " : ""}${t.last.body}`
                      : "No messages yet"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* the thread */}
      <section className="flex min-h-[32rem] flex-col rounded-panel border border-line bg-surface-2">
        {!thread ? (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <p className="font-display text-lg">Nothing to read yet.</p>
              <p className="mt-1 text-sm text-ink-soft">
                Threads live on bookings, so the first one opens with the first
                accepted offer.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-semibold tracking-tight">
                  {nameOf(thread)}
                </h3>
                <p className="truncate text-xs text-ink-soft">
                  {thread.campaign.name} · {formatEuros(thread.agreedPriceCents)} ·
                  post by {formatDay(thread.postBy)}
                </p>
              </div>
              <Link
                href={`/${party}/bookings/${thread.id}`}
                className="shrink-0 text-sm font-medium text-brand hover:text-brand-strong"
              >
                Open the booking →
              </Link>
            </header>

            <MessageThread
              bookingId={thread.id}
              viewerRole={party}
              counterpartName={nameOf(thread)}
              messages={thread.messages.map((m) => ({
                id: m.id,
                body: m.body,
                senderRole: m.senderRole as "brand" | "creator",
                at: formatDayTime(m.createdAt),
              }))}
            />
          </>
        )}
      </section>
    </div>
  );
}
