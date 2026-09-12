import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const c = await p.creator.findFirst({
    where: { urlSlug: "dana-whitmore" },
    include: { bundles: true, imports: true, account: true },
  });
  if (!c) return console.log("no creator claimed dana-whitmore");
  console.log("creator   :", c.displayName, "|", c.cardStatus, "| price", c.pricePerPostCents, "cents");
  console.log("industries:", c.industries.join(", ") || "(none)");
  console.log("medianViews:", c.medianViews, "| dataState:", c.dataState);
  console.log("account   :", c.account.email, "| bundles:", c.bundles.length);
  console.log("imports   :", c.imports.map((i) => `${i.tier}/${i.status}/${i.freshness}`).join(", "));
  const payload = c.imports[0]?.rawPayload as Record<string, unknown> | null;
  console.log("payload keys:", payload ? Object.keys(payload).join(",") : "none");
  console.log("live cards :", await p.creator.count({ where: { cardStatus: "live" } }));
}
main().finally(() => p.$disconnect());
