import { requireBrand } from "@/lib/auth";
import { MessagesScreen } from "@/components/messages-screen";
import { openThread } from "@/lib/messages";

export const metadata = { title: "Messages · naano" };

export default async function BrandMessages({
  searchParams,
}: PageProps<"/brand/messages">) {
  const { brand } = await requireBrand();
  const sp = await searchParams;
  // Before any rendering: the header counts unread and would otherwise show a
  // badge for the thread the person is about to read.
  const selected = await openThread(
    "brand",
    brand.id,
    typeof sp.booking === "string" ? sp.booking : undefined,
  );

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        <h1 className="font-display text-3xl">Messages</h1>
        <p className="mb-8 mt-1 text-ink-soft">
          One thread per booking, with the creator on the other end. Terms stay
          on the offer; this is for the work.
        </p>
        <MessagesScreen
          party="brand"
          partyId={brand.id}
          basePath="/brand/messages"
          selectedId={selected}
        />
      </main>
    </>
  );
}
