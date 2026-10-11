// src/lib/site.ts — what the site says about itself, wherever the database is not
// read: the canonical origin, the owner's name when the CV profile is missing, the
// theme colours outside CSS, the icon's drawing, and the per-page metadata helper.
import type { Metadata, ResolvingMetadata } from "next";

/**
 * The canonical origin. The same deploy also answers on morning-kafes-2604.netlify.app,
 * so every canonical URL, og:url and the sitemap name this host, whichever one served the page.
 */
export const SITE_URL = "https://nhatminh.dev";
export const SITE_NAME = "nhatminh.dev";

/** The owner's name where the profile cannot be read (OG image, manifest) or did not answer. */
export const OWNER_NAME = "Minh Nguyen";

/** First and last name from the CV profile, as the titles carry it; the fixed name without one. */
export function ownerName(profile: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || OWNER_NAME;
}

/** What `/` is, for its meta description and the manifest. The title already leads with the name. */
export function dashDescription(name: string): string {
  return `Sydney weather, Hacker News, NASA's picture of the day, a daily photograph, coffee news, a verse of the day, new games and YouTube — with ${name}'s CV.`;
}

/**
 * The tokens that leave CSS: theme-color, the manifest and the generated images cannot
 * read custom properties. Values mirror src/app/globals.css; change both together.
 */
export const COLORS = {
  bg: "#0E0F12",
  ink: "#ECEAE4",
  ink2: "#A7ABB3",
  ink3: "#7E838C",
  ruleStrong: "#363B44",
  accent: "#FF6A3D",
  bgLight: "#F7F5F0",
} as const;

/**
 * The icon: the masthead in miniature on a 16-unit grid — the vermilion mark, the stamp
 * beside it, the dateline, the clock line. [x, y, width, height, colour]. Whole units, so
 * each edge lands on a pixel at 16, 32 and 48 px. src/app/icon.svg draws the same rectangles.
 */
export const MARK: ReadonlyArray<readonly [number, number, number, number, string]> = [
  [3, 3, 5, 5, COLORS.accent],
  [9, 5, 4, 1, COLORS.ink2],
  [3, 10, 10, 2, COLORS.ink],
  [3, 13, 6, 1, COLORS.ink2],
];

// Fields every page shares. og:title and og:description are left out on purpose: Next
// fills them from the page's own title and description, so they can never disagree.
const OPEN_GRAPH = { type: "website", siteName: SITE_NAME, locale: "en_AU" } as const;

/** The root layout's Open Graph block: `/`'s own, and the default for any page that sets none. */
export const ROOT_OPEN_GRAPH = { ...OPEN_GRAPH, url: "/" } as const;

/**
 * Title, description, canonical URL and og:url for one page. Metadata merges shallowly:
 * a page that inherited the layout's `alternates` or `openGraph` would claim `/` as its
 * canonical URL and og:url, and a page that sets `openGraph` replaces the layout's whole
 * object, og:image included — so the image (app/opengraph-image.tsx) is carried over
 * from the parent's resolved metadata, with the query Next adds to its URL. That query
 * is a hash of opengraph-image.tsx alone: it changes when that file does, not when what
 * it imports from here (OWNER_NAME, COLORS) does — touch the file too, or crawlers keep
 * the old card.
 */
export async function pageMetadata(
  parent: ResolvingMetadata,
  page: { path: string; title: string; description: string },
): Promise<Metadata> {
  const images = (await parent).openGraph?.images;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: { ...OPEN_GRAPH, url: page.path, images },
  };
}
