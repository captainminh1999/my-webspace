// A short reading list drawn from several publishers' own feeds — the coffee card.
// Pure functions; netlify/functions/feeds/sources.ts does the fetching.
//
// Why not a news search: titles matching "coffee … americano" brought back
// "Pan-Americano" beach tennis and pumpkin-spice memes. Here the publisher is
// the filter, and the rules below only take out each paper's housekeeping posts.
import { cleanUrl, headline, isoDate } from "./rss.ts";

export interface Article {
  source: string;
  title: string;
  url: string;
  /** "" when the publisher gave no picture. */
  image: string;
  publishedAt: string;
}

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Posts from a WordPress site's JSON API (…/wp-json/wp/v2/posts?_embed=wp:featuredmedia).
 * `thumb` names the square thumbnail size, which differs from theme to theme.
 */
export function fromWordPress(posts: unknown, source: string, thumb = "thumbnail"): Article[] {
  if (!Array.isArray(posts)) return [];
  return posts.flatMap((p: Any) => {
    const title = headline(String(p?.title?.rendered ?? ""));
    const url = cleanUrl(String(p?.link ?? ""));
    if (!title || !url) return [];
    // `_embedded` can be missing, or hold an error object instead of the picture.
    const sizes = p?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes ?? {};
    const image = String(sizes[thumb]?.source_url ?? sizes.thumbnail?.source_url ?? sizes.medium?.source_url ?? "");
    // date_gmt carries no zone.
    const publishedAt = isoDate(`${p?.date_gmt ?? ""}Z`);
    return [{ source, title, url, image: /^https?:\/\//i.test(image) ? image : "", publishedAt }];
  });
}

/** Each paper's round-ups, series and house notices — every entry was seen in a live feed. */
const HOUSEKEEPING = [
  /^build-outs of coffee/i, // Sprudge's daily café-fit-out series
  /^coffee news recap/i, // Perfect Daily Grind
  /^weekly coffee news/i, // Daily Coffee News
  /^coffee news club/i, // Fresh Cup
  /^the insider:/i, // Barista Magazine
  /global coffee awards/i, // Perfect Daily Grind's own awards
  /\bpodcast\b|^episode \d+/i,
  /\b(sponsored|giveaway|webinar|we(?:'|’)re hiring)\b/i,
];

export interface Pick {
  /** How many items to keep. */
  count: number;
  /** Items older than this many days are left out, so a paper that stops publishing fades from the card. */
  days: number;
  /** Most items from one source; 2 unless the source is named here. */
  caps?: Record<string, number>;
  /** Per source: a title must match `keep` and must not match `drop`. */
  only?: Record<string, { keep?: RegExp; drop?: RegExp }>;
  now?: number;
}

const storyKey = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9 ]+/g, "").split(/\s+/).filter(Boolean).slice(0, 6).join(" ");

/**
 * Chooses the list. The pool is read newest first, one item per source, then a second
 * round up to each source's cap — so a paper that posts five times a day cannot fill the
 * card, and the first items (the three the card shows) come from different papers.
 */
export function selectReading(pool: Article[], { count, days, caps = {}, only = {}, now = Date.now() }: Pick): Article[] {
  const urls = new Set<string>();
  const told = new Map<string, string>(); // story key → the paper that told it first
  const eligible = pool
    .filter((a) => a.publishedAt && now - Date.parse(a.publishedAt) <= days * 86_400_000)
    .filter((a) => !HOUSEKEEPING.some((re) => re.test(a.title)))
    .filter((a) => (only[a.source]?.keep?.test(a.title) ?? true) && !only[a.source]?.drop?.test(a.title))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    // The same story can run in two papers; the first (newest) telling stays. Within one paper
    // a shared opening is a series ("…: Part One", "…: Part Two"), not a repeat.
    .filter((a) => {
      const key = storyKey(a.title);
      const first = key ? told.get(key) : undefined;
      if (urls.has(a.url) || (first !== undefined && first !== a.source)) return false;
      urls.add(a.url);
      if (key && first === undefined) told.set(key, a.source);
      return true;
    });

  const picked: Article[] = [];
  const taken: Record<string, number> = {};
  const rounds = Math.max(1, ...eligible.map((a) => caps[a.source] ?? 2));
  for (let round = 1; round <= rounds && picked.length < count; round++) {
    for (const a of eligible) {
      if (picked.length === count) break;
      if (picked.includes(a) || (taken[a.source] ?? 0) >= Math.min(round, caps[a.source] ?? 2)) continue;
      taken[a.source] = (taken[a.source] ?? 0) + 1;
      picked.push(a);
    }
  }
  return picked;
}
