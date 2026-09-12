"use client";

import { useActionState } from "react";
import { saveBrandAccount } from "@/app/actions/account";
import type { ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";

export type Icp = { title: string; description: string };

export function BrandAccountForm({
  name,
  website,
  valueProposition,
  icps,
}: {
  name: string;
  website: string;
  valueProposition: string;
  icps: Icp[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveBrandAccount,
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <Field label="Company name" hint="Creators see this on every offer and in every thread.">
        <input
          name="name"
          defaultValue={name}
          required
          className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
        />
      </Field>

      <Field label="Website" hint="Optional.">
        <input
          name="website"
          type="url"
          defaultValue={website}
          placeholder="https://"
          className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
        />
      </Field>

      <Field
        label="What you sell"
        hint="Pre-fills the product line when you create a campaign."
      >
        <textarea
          name="valueProposition"
          rows={3}
          defaultValue={valueProposition}
          className="w-full resize-y rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
        />
      </Field>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Who you sell to
        </p>
        <p className="mb-3 mt-0.5 text-xs text-ink-mute">
          Up to three. These become the audience line on a new campaign&apos;s
          brief.
        </p>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.6fr]">
              <input
                name={`icp${i}Title`}
                defaultValue={icps[i]?.title ?? ""}
                placeholder="Head of Growth"
                className="rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
              />
              <input
                name={`icp${i}Desc`}
                defaultValue={icps[i]?.description ?? ""}
                placeholder="At a scaling B2B SaaS company"
                className="rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>
          ))}
        </div>
      </div>

      {state && (
        <p
          className={`rounded-card px-4 py-3 text-sm ${
            state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
          }`}
        >
          {state.error ?? state.ok}
        </p>
      )}

      <ActionButton className="px-5 py-3" pending={pending} pendingLabel="Saving…">
        Save
      </ActionButton>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      {hint && <p className="mb-2 mt-0.5 text-xs text-ink-mute">{hint}</p>}
      <div className={hint ? "" : "mt-1.5"}>{children}</div>
    </div>
  );
}
