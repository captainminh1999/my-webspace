// src/app/sitemap.ts — /sitemap.xml: the Daily Dash, the CV and its section pages,
// built once at build time from the section list. No database read.
import type { MetadataRoute } from "next";
import { SECTIONS } from "@/components/cv/sectionList";
import { SITE_URL } from "@/lib/site";

// No lastModified: the file is generated once per deploy while the pages change
// whenever a feed or the CV does (ISR, 60 s), so a build date would claim a page
// had not changed when it had. changeFrequency and priority are left out too:
// Google ignores both.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/about-me", ...SECTIONS.flatMap((s) => (s.href ? [s.href] : []))];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).href }));
}
