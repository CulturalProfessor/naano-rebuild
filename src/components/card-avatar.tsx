"use client";

import { useState } from "react";

/**
 * The portrait, with a fallback that actually fires.
 *
 * A real LinkedIn profile hands us a CDN URL that the browser often cannot
 * load: the host refuses off-site requests, and a signed URL expires. The
 * server cannot tell — it never fetches the image — so the only place to
 * notice is the browser, which is why this one piece of the card is a client
 * component. Without it a genuine signup gets an empty grey circle on the
 * card they just built, which is the worst possible first impression.
 */
export function CardAvatar({
  src,
  displayName,
  className = "",
}: {
  src: string | null;
  displayName: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "?";

  if (!src || failed) {
    return (
      <div
        className={`grid h-full w-full place-items-center font-display text-2xl font-semibold text-ink-mute ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    // Seeded avatars are illustrated and deterministic. A plain img keeps a
    // dead image host from taking the card down with it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
