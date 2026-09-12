"use client";

import { useState } from "react";

/** The tracking link, and one click to take it away with you. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-2 rounded-card border border-line bg-surface-2 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-sm">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              },
              () => setCopied(false),
            );
          }}
          className="shrink-0 rounded-pill bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-strong"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
