import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * The tracking redirect.
 *
 * This is the only part of the product that is genuinely ours rather than a
 * view of LinkedIn, and it is the reason the brand's dashboard can show a
 * number neither side has to take on trust. A real HTTP endpoint rather than a
 * Server Function, because the thing that hits it is a stranger's browser
 * following a link out of a post.
 *
 * One code resolves to exactly one booking, which resolves to exactly one
 * creator, one campaign and one brand. That is the whole attribution model.
 */

export const dynamic = "force-dynamic";

/** Enough to tell Chrome from Safari on the dashboard. Never the full string. */
function uaFamily(ua: string | null): string | null {
  if (!ua) return null;
  if (/bot|crawler|spider|preview|curl|wget|headless/i.test(ua)) return "Bot";
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

/**
 * Hashed with the code as salt, so the same visitor is recognisable within one
 * campaign and nowhere else. We never store a raw address: the point of the
 * hash is to be able to spot a refresh loop, not to identify a person.
 */
function hashIp(ip: string | null, code: string): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${code}:${ip}`).digest("hex").slice(0, 32);
}

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function GET(
  req: NextRequest,
  { params }: RouteContext<"/r/[code]">,
) {
  const { code } = await params;

  const booking = await prisma.booking.findUnique({
    where: { trackingCode: code },
    select: { id: true, status: true },
  });

  // An unknown code is a typo or a stale link, not an error worth a stack
  // trace. Send them to the marketplace rather than a 404 nobody can act on.
  if (!booking) {
    return NextResponse.redirect(new URL("/marketplace", req.url), 302);
  }

  const family = uaFamily(req.headers.get("user-agent"));
  const ipHash = hashIp(clientIp(req), code);

  // Link previews and crawlers follow this URL too. Counting them would inflate
  // the one number in the product that is supposed to be trustworthy.
  if (family !== "Bot") {
    // A single visitor refreshing is not a second click. Ten minutes is long
    // enough to catch a double tap and short enough to keep a genuine return
    // visit in the count.
    const recent = ipHash
      ? await prisma.clickEvent.findFirst({
          where: {
            bookingId: booking.id,
            ipHash,
            occurredAt: { gt: new Date(Date.now() - 10 * 60_000) },
          },
          select: { id: true },
        })
      : null;

    if (!recent) {
      await prisma.clickEvent.create({
        data: {
          bookingId: booking.id,
          trackingCode: code,
          referrer: req.headers.get("referer"),
          uaFamily: family,
          ipHash,
        },
      });

      // The first click is what moves a booking from posted to measuring. It is
      // the only state transition in the machine that no human triggers.
      if (booking.status === "posted") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "measuring" },
        });
      }
    }
  }

  return NextResponse.redirect(new URL(`/go/${code}`, req.url), 302);
}
