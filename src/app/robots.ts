import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private dashboards + endpoints. Everything public stays crawlable;
        // duplicate filter permutations are handled with canonical tags on
        // /browse rather than a Disallow, so link equity still flows.
        disallow: ["/admin", "/seoteam", "/preview", "/login", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
