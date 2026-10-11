// src/app/robots.ts — /robots.txt. The same file is served on every host this deploy
// answers on, so the sitemap is named by the canonical origin, not the request's.
// Deploy previews and branch deploys need nothing here: Netlify sends them with
// `x-robots-tag: noindex` itself.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin/ stays crawlable on purpose: its noindex (header and meta) is only read on a page that is fetched,
    // and it was indexable until 2026-09 — a Disallow would keep any old entry in the index for good.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
