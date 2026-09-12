import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
      The client router cache. Next 15 changed the `dynamic` default to 0, and
      every page in this product is dynamic, so going Overview → Campaigns →
      Overview re-rendered the first page from the database each time. Thirty
      seconds makes stepping back and forth instant.

      Safe here because every mutation is a Server Function that calls
      revalidatePath, which clears this cache for the paths it names. The
      window only applies to a page nobody has changed.
    */
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
