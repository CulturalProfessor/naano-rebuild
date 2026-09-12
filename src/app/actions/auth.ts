"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { startSession, endSession, currentAccount } from "@/lib/session";
import { homeFor } from "@/lib/auth";

/**
 * Server Functions are reachable by direct POST, not only through our own UI,
 * so each of these validates its own input and resolves the viewer from the
 * session rather than from anything the caller sent.
 */

export type AuthState = { error?: string } | null;

const MIN_PASSWORD = 8;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "brand" ? "brand" : "creator";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "That does not look like an email address." };
  }
  if (password.length < MIN_PASSWORD) {
    return { error: `Use at least ${MIN_PASSWORD} characters.` };
  }

  const existing = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { error: "An account with that email already exists. Sign in instead." };
  }

  const account = await prisma.account.create({
    data: { email, passwordHash: await bcrypt.hash(password, 10), role },
  });

  await startSession({ accountId: account.id, role: account.role });

  // Brands go straight to naming their company and first campaign; creators go
  // to the profile import, which is step 2 of 4.
  redirect(role === "brand" ? "/onboarding/brand" : "/onboarding/profile");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const account = await prisma.account.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      passwordHash: true,
      creator: { select: { cardStatus: true } },
    },
  });

  // One message for both cases, so this cannot be used to enumerate accounts.
  const invalid = { error: "Those details do not match an account." };
  if (!account) {
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinv");
    return invalid;
  }
  if (!(await bcrypt.compare(password, account.passwordHash))) return invalid;

  await startSession({ accountId: account.id, role: account.role });
  await prisma.account.update({
    where: { id: account.id },
    data: { lastSeenAt: new Date() },
  });

  redirect(homeFor(account));
}

export async function signOut() {
  await endSession();
  redirect("/");
}

/** Used by the header to show who is signed in. */
export async function viewer() {
  return currentAccount();
}
