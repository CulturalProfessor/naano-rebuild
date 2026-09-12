import "server-only";

/**
 * Copying the profile picture, once.
 *
 * The profile service returns a signed CDN URL. A browser usually cannot load
 * it. The host refuses off-site requests, and the signature expires within
 * days, so a real signup ended up with an empty circle on the card they had
 * just built. Proxying the URL does not fix the expiry: once it lapses there
 * is nothing left to proxy. The only thing that survives is the bytes, taken
 * server-to-server while the URL is still good.
 *
 * Same discipline as the profile read itself: one fetch, a short timeout, a
 * hard size cap, and a failure that returns null rather than throwing. A
 * missing picture is a card with initials on it, which is fine. A signup that
 * dies because an image host was slow is not.
 */

const TIMEOUT_MS = 5000;

/** Comfortably above a LinkedIn profile picture, far below anything abusive. */
const MAX_BYTES = 512 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function fetchAvatarData(url: string | null): Promise<string | null> {
  if (!url) return null;

  // Already inline, or already ours: nothing to copy.
  if (url.startsWith("data:") || url.startsWith("/")) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  try {
    const res = await fetch(parsed, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED.has(type)) return null;

    // Trust the header only as a fast reject; the real check is the body.
    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BYTES) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Where a copied picture is served from. Set on the creator at import time. */
export function avatarRoute(creatorId: string) {
  return `/a/${creatorId}`;
}
