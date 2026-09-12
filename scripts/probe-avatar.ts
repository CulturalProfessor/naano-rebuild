import { fetchAvatarData } from "../src/lib/avatar";

/** Exercise the avatar copy from the CLI: pnpm tsx scripts/probe-avatar.ts <url> */
const url = process.argv[2];
if (!url) {
  console.error("usage: probe-avatar <image-url>");
  process.exit(1);
}
async function main() {
  const data = await fetchAvatarData(url);
  console.log(
    data
      ? `ok  ${data.slice(0, 32)}…  ${Math.round((data.length * 3) / 4 / 1024)}KB`
      : "null (refused, too large, wrong type, or unreachable)",
  );
}

void main();
