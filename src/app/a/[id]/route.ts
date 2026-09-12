import { prisma } from "@/lib/db";

/**
 * The stored profile picture.
 *
 * Served from here rather than inlined into the card so the browser caches it
 * once and every grid that lists the creator stays small. The bytes never
 * change for a given creator without a new import, and an import writes a new
 * row, so the response is immutable for a year.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const creator = await prisma.creator.findUnique({
    where: { id },
    select: { avatarData: true },
  });

  const data = creator?.avatarData;
  if (!data) return new Response("Not found", { status: 404 });

  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(data);
  if (!match) return new Response("Not found", { status: 404 });

  const [, type, base64] = match;
  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
