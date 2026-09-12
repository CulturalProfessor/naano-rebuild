import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Migrations need a real session: transaction-mode pooling cannot run DDL.
 * So Migrate uses DIRECT_URL when one is set, and the app's runtime client
 * (src/lib/db.ts) separately uses DATABASE_URL, which in production is the
 * transaction pooler.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("Set DATABASE_URL (or DIRECT_URL) before running Prisma.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
});
