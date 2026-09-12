"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The top rail.
 *
 * Every screen in this product is database-backed and per-user, so no
 * navigation is instant. Route-level loading.tsx covers the destination, but
 * there is a gap before that fallback renders, on a marketplace filter click
 * especially, where the whole point is that the filter bar must stay put and
 * only the grid may fall back. The rail covers that gap: one pixel of motion
 * at the top of the window that says the click landed.
 *
 * It lives in an external store rather than useState because the route-change
 * effect has to clear it, and React's compiler lint rejects setState in an
 * effect body. A store also means a nav can be started from anywhere later.
 */

let running = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function startRouteProgress() {
  if (running) return;
  running = true;
  emit();
}

export function stopRouteProgress() {
  if (!running) return;
  running = false;
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

const getSnapshot = () => running;
const getServerSnapshot = () => false;

/** Does this click actually start a same-tab navigation we should track? */
function isNavigatingClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const anchor = (event.target as Element | null)?.closest?.("a");
  if (!anchor) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  // A link to exactly where we already are navigates nowhere.
  return url.href !== window.location.href;
}

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // The new route has committed, so whatever was running is done.
  useEffect(() => {
    stopRouteProgress();
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isNavigatingClick(event)) startRouteProgress();
    };
    // A GET form is a real browser navigation with no React pending state of
    // its own. The matching search is one, so it needs the rail too.
    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (form?.method?.toLowerCase() === "get") startRouteProgress();
    };
    // Capture phase: React's own handler may stop propagation first.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", startRouteProgress);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", startRouteProgress);
    };
  }, []);

  // A navigation React declined to make would otherwise leave the rail stuck.
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(stopRouteProgress, 10_000);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <span
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      {active && (
        <span className="rail-run block h-full w-full origin-left bg-brand shadow-[0_0_8px_rgba(22,82,240,0.6)]" />
      )}
    </span>
  );
}
