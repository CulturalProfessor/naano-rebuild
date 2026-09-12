import { requireBrand } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandAccountForm, type Icp } from "./account-form";

export const metadata = { title: "Account · naano" };

export default async function BrandAccount() {
  const { account, brand } = await requireBrand();

  const row = await prisma.brand.findUniqueOrThrow({
    where: { id: brand.id },
    select: { name: true, website: true, valueProposition: true, icps: true },
  });

  const icps = Array.isArray(row.icps) ? (row.icps as unknown as Icp[]) : [];

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl">Account</h1>
        <p className="mt-1 text-ink-soft">
          Your company, as creators see it. Signed in as {account.email}.
        </p>

        <div className="mt-8">
          <BrandAccountForm
            name={row.name}
            website={row.website ?? ""}
            valueProposition={row.valueProposition ?? ""}
            icps={icps}
          />
        </div>

        <p className="mt-8 rounded-card border border-line bg-surface-3 px-4 py-3 text-xs text-ink-soft">
          There is no password change and no email change in this build, and no
          way to delete the account. All three need email delivery to do safely,
          and there is no sending domain here. Named in the README rather than
          half-built.
        </p>
      </main>
    </>
  );
}
