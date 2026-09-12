import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { prisma } from "./db";
import type { Role } from "@prisma/client";

/**
 * Sessions are a signed, HTTP-only cookie carrying the account id and role.
 *
 * Not a magic link: a magic link needs email delivery, a sending domain and a
 * deliverability problem at 3am. A hashed password and a cookie needs none of
 * that, and a stranger can get back into the account they made yesterday.
 *
 * There is no password reset in this build. That is in the README, not hidden.
 */

const COOKIE = "naano_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short.");
  }
  return s;
}

export type Session = { accountId: string; role: Role };

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialize(session: Session) {
  const payload = Buffer.from(
    JSON.stringify({ ...session, n: randomBytes(6).toString("base64url") }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function deserialize(token: string): Session | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const given = token.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed.accountId !== "string") return null;
    if (parsed.role !== "creator" && parsed.role !== "brand") return null;
    return { accountId: parsed.accountId, role: parsed.role };
  } catch {
    return null;
  }
}

export async function startSession(session: Session) {
  const jar = await cookies();
  jar.set(COOKIE, serialize(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The raw cookie claim. Trusted only as far as the signature goes. */
export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? deserialize(token) : null;
}

/**
 * The session, confirmed against the database.
 *
 * Server Functions are reachable by direct POST, not only through our own UI,
 * so every one of them resolves the viewer through here rather than trusting a
 * caller-supplied id.
 *
 * Wrapped in React's cache so the layout, the page and the header each ask for
 * the viewer and the database is asked once. Measured before this: three
 * identical account lookups to render one creator card.
 */
export const currentAccount = cache(async () => {
  const session = await readSession();
  if (!session) return null;

  const account = await prisma.account.findUnique({
    where: { id: session.accountId },
    select: {
      id: true,
      email: true,
      role: true,
      brand: { select: { id: true, name: true, slug: true } },
      creator: {
        select: { id: true, displayName: true, urlSlug: true, cardStatus: true },
      },
    },
  });
  return account ?? null;
});

export type CurrentAccount = NonNullable<
  Awaited<ReturnType<typeof currentAccount>>
>;
