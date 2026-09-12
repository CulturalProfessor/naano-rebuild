"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveCampaign } from "@/app/actions/campaigns";
import type { ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";
import { INDUSTRIES, MAX_INDUSTRIES, REGIONS } from "@/lib/taxonomy";

export type CampaignDraft = {
  id?: string;
  name: string;
  briefProduct: string;
  briefAudience: string;
  industries: string[];
  regions: string[];
  budgetCapEuros: string;
  dealValueEuros: string;
  postDeadlineDays: number;
};

/**
 * One form for creating and for editing.
 *
 * The brief is not paperwork: the product line is what every creator writes
 * from and what the matcher scores against, and the assumed deal value is the
 * multiplier behind every pipeline figure on the dashboard. So each field says
 * what it feeds rather than just naming itself.
 */
export function CampaignForm({
  draft,
  cancelHref,
}: {
  draft: CampaignDraft;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveCampaign,
    null,
  );
  const [industries, setIndustries] = useState<string[]>(draft.industries);
  const [regions, setRegions] = useState<string[]>(draft.regions);

  // Functional update, not a read of the render's own array: two chips clicked
  // inside one tick both saw the old list, and the second silently discarded
  // the first.
  const toggle = (
    set: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    max?: number,
  ) =>
    set((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : max && prev.length >= max
          ? prev
          : [...prev, value],
    );

  return (
    <form action={action} className="space-y-7">
      {draft.id && <input type="hidden" name="campaignId" value={draft.id} />}
      {industries.map((i) => (
        <input key={i} type="hidden" name="industries" value={i} />
      ))}
      {regions.map((r) => (
        <input key={r} type="hidden" name="regions" value={r} />
      ))}

      <Field label="Campaign name" hint="Only you and your creators see this.">
        <input
          name="name"
          defaultValue={draft.name}
          required
          placeholder="Main campaign"
          className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none transition-colors focus:border-brand"
        />
      </Field>

      <Field
        label="The product"
        hint="Every creator writes from this line, and the matcher scores topic fit against it. Two sentences beats twenty words."
      >
        <textarea
          name="briefProduct"
          defaultValue={draft.briefProduct}
          rows={4}
          required
          className="w-full resize-y rounded-card border border-line bg-surface px-3.5 py-3 outline-none transition-colors focus:border-brand"
        />
      </Field>

      <Field
        label="The audience"
        hint="The job titles you are trying to reach. Separate them with a middle dot or a comma."
      >
        <input
          name="briefAudience"
          defaultValue={draft.briefAudience}
          required
          placeholder="Head of Growth at B2B SaaS · Head of Support"
          className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none transition-colors focus:border-brand"
        />
      </Field>

      <Field
        label={`Industries (${industries.length} of ${MAX_INDUSTRIES})`}
        hint="Topic overlap is the heaviest input to the shortlist, worth 40 of the 100 points."
      >
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => {
            const on = industries.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(setIndustries, i, MAX_INDUSTRIES)}
                className={`rounded-pill border px-3 py-1.5 text-xs transition-colors ${
                  on
                    ? "border-brand bg-brand-soft font-medium text-brand-strong"
                    : "border-line bg-surface text-ink-soft hover:border-ink-mute"
                }`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Regions"
        hint="A creator outside every region you pick scores zero on the region axis."
      >
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const on = regions.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(setRegions, r)}
                className={`rounded-pill border px-3 py-1.5 text-xs transition-colors ${
                  on
                    ? "border-brand bg-brand-soft font-medium text-brand-strong"
                    : "border-line bg-surface text-ink-soft hover:border-ink-mute"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Budget cap per post" hint="Optional. Leave blank for none.">
          <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3.5 py-3">
            <span className="text-ink-soft">€</span>
            <input
              name="budgetCap"
              type="number"
              min={0}
              step="any"
              defaultValue={draft.budgetCapEuros}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </Field>

        <Field
          label="Assumed deal value"
          hint="Estimated pipeline is leads × this. The multiplier is printed next to every total it feeds."
        >
          <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3.5 py-3">
            <span className="text-ink-soft">€</span>
            <input
              name="dealValue"
              type="number"
              min={0}
              step="any"
              defaultValue={draft.dealValueEuros}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </Field>

        <Field label="Days to post" hint="The default deadline on a new offer.">
          <input
            name="postDeadlineDays"
            type="number"
            min={1}
            max={90}
            step={1}
            defaultValue={draft.postDeadlineDays}
            className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
          />
        </Field>
      </div>

      <div className="rounded-card bg-brand-soft px-4 py-3 text-sm text-ink">
        <strong className="font-semibold">
          Creators can adapt the angle to their expertise, while keeping every
          product claim factual.
        </strong>{" "}
        <span className="text-ink-soft">
          This guardrail is on every brief and is not editable in this build.
        </span>
      </div>

      {state?.error && (
        <p className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <ActionButton
          className="px-5 py-3"
          pending={pending}
          pendingLabel={draft.id ? "Saving…" : "Creating…"}
        >
          {draft.id ? "Save the brief" : "Create the campaign"}
        </ActionButton>
        <Link href={cancelHref} className="text-sm text-ink-soft hover:text-ink">
          Cancel
        </Link>
      </div>
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
