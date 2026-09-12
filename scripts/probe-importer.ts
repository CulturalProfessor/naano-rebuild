/** Exercises the importer chain directly, without the UI. */
import "dotenv/config";
import { importProfile } from "../src/lib/profile-importer";

const target = process.argv[2] ?? "https://www.linkedin.com/in/nina-costa";

async function main() {
  console.log("LINKEDIN_API:", process.env.LINKEDIN_API ? "set" : "UNSET");
  console.log("importing:", target);
  const started = Date.now();
  const r = await importProfile(target, { ip: "127.0.0.1" });
  const ms = Date.now() - started;
  if (r.ok) {
    console.log(`ok  tier=${r.tier} freshness=${r.freshness} in ${ms}ms`);
    console.log("  name        :", r.profile.fullName);
    console.log("  headline    :", r.profile.headline);
    console.log("  country     :", r.profile.country, `(${r.profile.countryCode || "no code"})`);
    console.log("  followers   :", r.profile.followerCount);
    console.log("  avatar      :", r.profile.avatarUrl ? r.profile.avatarUrl.slice(0, 60) + "…" : null);
  } else {
    console.log(`not imported: ${r.reason} (falls back to ${r.fallback}) in ${ms}ms`);
  }
}
main();
