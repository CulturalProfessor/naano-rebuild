import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { deriveCpmCents, formatEuros, compactNumber, DASH } from "../src/lib/pricing";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const c = await prisma.creator.findMany({ orderBy: { followerCount: "desc" }, take: 6 });
  console.log("name                | followers |   price  | medViews |  CPM");
  for (const x of c) {
    const cpm = deriveCpmCents(x.pricePerPostCents, x.medianViews);
    console.log(
      x.displayName.padEnd(19), "|",
      compactNumber(x.followerCount).padStart(8), "|",
      formatEuros(x.pricePerPostCents).padStart(8), "|",
      (x.medianViews ? compactNumber(x.medianViews) : DASH).padStart(8), "|",
      cpm === null ? DASH : formatEuros(cpm));
  }
  const pend = await prisma.creator.findMany({ where: { medianViews: null }, select: { displayName: true, pricePerPostCents: true } });
  console.log("\npending (dash) creators:", pend.map(p => `${p.displayName} ${formatEuros(p.pricePerPostCents)}`).join(", "));
  const clicks = await prisma.clickEvent.count();
  const leads = await prisma.lead.count();
  const pipeline = await prisma.lead.aggregate({ _sum: { pipelineValueCents: true } });
  console.log(`\nclicks ${clicks} | leads ${leads} | attributed pipeline ${formatEuros(pipeline._sum.pipelineValueCents ?? 0)}`);
  const live = await prisma.offer.count({ where: { status: "offered" } });
  console.log(`open offers awaiting a creator: ${live}`);
}
main().finally(() => prisma.$disconnect());
