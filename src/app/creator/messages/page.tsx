import { requireCreator } from "@/lib/auth";
import { MessagesScreen } from "@/components/messages-screen";
import { openThread } from "@/lib/messages";

export const metadata = { title: "Messages — naano" };

export default async function CreatorMessages({
  searchParams,
}: PageProps<"/creator/messages">) {
  const { creator } = await requireCreator();
  const sp = await searchParams;
  // Before any rendering: the header counts unread and would otherwise show a
  // badge for the thread the person is about to read.
  const selected = await openThread(
    "creator",
    creator.id,
    typeof sp.booking === "string" ? sp.booking : undefined,
  );

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        <h1 className="font-display text-3xl">Messages</h1>
        <p className="mb-8 mt-1 text-ink-soft">
          One thread per booking, with the brand on the other end. Ask about the
          angle, the deadline, or anything the brief left open.
        </p>
        <MessagesScreen
          party="creator"
          partyId={creator.id}
          basePath="/creator/messages"
          selectedId={selected}
        />
      </main>
    </>
  );
}
