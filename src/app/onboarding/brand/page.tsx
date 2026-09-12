import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INDUSTRIES } from "@/lib/queries";
import { saveBrandProfile } from "@/app/actions/brand-onboarding";

export const metadata = { title: "Your company — naano" };

const GUARDRAIL =
  "Creators can adapt the angle to their expertise, while keeping every product claim factual.";

export default async function BrandOnboardingPage() {
  const account = await requireAccount();
  if (account.role !== "brand") redirect("/creator");

  const brand = await prisma.brand.findUnique({ where: { accountId: account.id } });
  const icps = (brand?.icps as { title: string; description: string }[] | null) ?? [];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <div className="mb-10 font-display text-lg font-bold tracking-tight">naano</div>
        <div className="mx-auto w-full max-w-lg flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Step 2 of 2
          </p>
          <h1 className="mt-2 font-display text-3xl">Value prop &amp; ICP</h1>
          <p className="mt-3 text-ink-soft">
            Review these details once. Naano turns them into a brief for your
            creators.
          </p>

          <form action={saveBrandProfile} className="mt-8 space-y-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Company name
              </span>
              <input
                name="name"
                required
                defaultValue={brand?.name ?? ""}
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Website
              </span>
              <input
                name="website"
                type="url"
                placeholder="https://"
                defaultValue={brand?.website ?? ""}
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
              />
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Value proposition
              </span>
              <p className="mb-1.5 text-sm text-ink-soft">
                What the company does, for whom, how. Four to six sentences.
              </p>
              <textarea
                name="valueProposition"
                rows={6}
                defaultValue={brand?.valueProposition ?? ""}
                className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
              />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                3 ideal customers (ICP)
              </span>
              <p className="mb-2 text-sm text-ink-soft">
                The audiences your creators need to understand.
              </p>
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-card border border-line bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">
                        {i + 1}
                      </span>
                      <input
                        name={`icp${i}Title`}
                        placeholder="Head of Growth at B2B SaaS"
                        defaultValue={icps[i]?.title ?? ""}
                        className="flex-1 bg-transparent text-sm font-medium outline-none"
                      />
                    </div>
                    <input
                      name={`icp${i}Desc`}
                      placeholder="What they own and what they need"
                      defaultValue={icps[i]?.description ?? ""}
                      className="mt-2 w-full bg-transparent text-sm text-ink-soft outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Industries your creators should cover
              </span>
              <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-card border border-line bg-surface p-3">
                {INDUSTRIES.map((i) => (
                  <label
                    key={i}
                    className="cursor-pointer rounded-pill border border-line px-3 py-1.5 text-xs text-ink-soft has-checked:border-brand has-checked:bg-brand-soft has-checked:font-medium has-checked:text-brand-strong"
                  >
                    <input type="checkbox" name="industries" value={i} className="sr-only" />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Budget cap per post (optional)
              </span>
              <input
                name="budgetCap"
                type="number"
                min={0}
                placeholder="1500"
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-card bg-brand px-4 py-3 font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Create my first campaign
            </button>
          </form>
        </div>
      </div>

      <div className="hidden flex-col justify-center bg-gradient-to-b from-sky-3 to-surface-2 px-12 lg:flex">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Starter creator brief
          </p>
          <h2 className="mt-2 font-display text-3xl">What your creators will receive.</h2>
          <div className="mt-6 rounded-panel border border-line bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-ink-soft">Guardrail</p>
            <p className="mt-2 text-sm">{GUARDRAIL}</p>
            <p className="mt-5 text-xs text-ink-soft">
              Every creator you invite receives this brief. You can edit it later
              from Campaigns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
