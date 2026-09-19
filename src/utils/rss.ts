// A small RSS 2.0 / Atom reader for the news feeds. No dependency: it reads the
// handful of elements the dashboard shows (title, link, date, a thumbnail, the
// categories) and ignores the rest. Malformed items are skipped, never thrown on.
export interface FeedItem {
  title: string;
  url: string;
  /** "" when the feed carries no picture for the item. */
  image: string;
  /** ISO 8601, or "" when the feed's date cannot be read. */
  publishedAt: string;
  categories: string[];
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** XML-level decoding only. HTML entities left inside CDATA ("&#8217;") are decoded when the page renders (src/lib/dashboard.ts). */
function decodeXml(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (match, code: string) => {
    const named = XML_ENTITIES[code.toLowerCase()];
    if (named) return named;
    const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isNaN(n) || n > 0x10ffff ? match : String.fromCodePoint(n);
  });
}

const HTML_ENTITIES: Record<string, string> = {
  ...XML_ENTITIES, nbsp: " ", hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

/** A headline as plain text: markup out, entities decoded ("What&#8217;s <em>new</em>" → "What’s new"). */
export function headline(html: string): string {
  return html
    // Only what is shaped like a tag: "I <3 coffee: latte > mocha" keeps its middle.
    .replace(/<\/?[a-z][^<>]*>/gi, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] !== "#") return HTML_ENTITIES[code.toLowerCase()] ?? match;
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(n) || n > 0x10ffff ? match : String.fromCodePoint(n);
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** An http(s) link without its campaign tags (?utm_source=rss…); "" for anything else. */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    for (const key of [...u.searchParams.keys()]) if (/^utm_/i.test(key)) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return "";
  }
}

/** ISO 8601 for a date a feed gave, or "" when it cannot be read or lies more than a day ahead. */
export function isoDate(raw: string, now = Date.now()): string {
  const t = new Date(raw).getTime();
  return Number.isNaN(t) || t > now + 86_400_000 ? "" : new Date(t).toISOString();
}

/** The character data of an element: CDATA sections as they are, everything else XML-decoded. */
function text(raw: string): string {
  return raw
    .split(/(<!\[CDATA\[[\s\S]*?\]\]>)/)
    .map((part) => (part.startsWith("<![CDATA[") ? part.slice(9, -3) : decodeXml(part)))
    .join("");
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Inner XML of the first <name>…</name> in a block, or "". */
function inner(block: string, name: string): string {
  const m = block.match(new RegExp(`<${escapeRe(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRe(name)}>`, "i"));
  return m ? m[1] : "";
}

/** Every opening tag called `name` in a block, as written. */
function tags(block: string, name: string): string[] {
  return block.match(new RegExp(`<${escapeRe(name)}(?:\\s[^>]*)?/?>`, "gi")) ?? [];
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\s${escapeRe(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decodeXml(m[1] ?? m[2] ?? "") : "";
}

const plain = (html: string) => html.replace(/<\/?[a-z][^<>]*>/gi, " ").replace(/\s+/g, " ").trim();

// WordPress feeds list the author's avatar as media:content; trackers and spacers are not pictures either.
const NOT_A_PICTURE = /gravatar\.com|feedburner\.com|s\.w\.org\/images\/core\/emoji|\/pixel[./?]|\bspacer\b|\.(?:svg|tiff?)(?:\?|$)/i;
const usable = (url: string) => /^https?:\/\//i.test(url) && !NOT_A_PICTURE.test(url);

/** From a srcset, the smallest candidate that still fills a 48px thumbnail on a dense screen; "" when there is none. */
function smallest(srcset: string): string {
  const candidates = srcset
    .split(",")
    .map((c) => c.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: /^\d+w$/.test(w ?? "") ? parseInt(w, 10) : 0 }))
    .filter((c) => c.w >= 144 && usable(c.url))
    .sort((a, b) => a.w - b.w);
  return candidates[0]?.url ?? "";
}

function image(item: string): string {
  for (const tag of tags(item, "media:content")) {
    const url = attr(tag, "url");
    const kind = attr(tag, "medium") || attr(tag, "type");
    if (usable(url) && (!kind || /image/i.test(kind))) return url;
  }
  for (const tag of tags(item, "media:thumbnail")) {
    const url = attr(tag, "url");
    if (usable(url)) return url;
  }
  for (const tag of tags(item, "enclosure")) {
    const url = attr(tag, "url");
    if (usable(url) && /^image\//i.test(attr(tag, "type"))) return url;
  }
  // The first picture in the body, which a feed carries either as CDATA or as escaped HTML.
  for (const name of ["content:encoded", "description", "content", "summary"]) {
    for (const tag of tags(text(inner(item, name)), "img")) {
      if (attr(tag, "width") === "1" || attr(tag, "height") === "1") continue;
      const url = smallest(attr(tag, "srcset")) || attr(tag, "src");
      if (usable(url)) return url;
    }
  }
  return "";
}

function link(item: string): string {
  const rss = text(inner(item, "link")).trim();
  if (rss) return rss;
  // Atom: <link href> — the alternate one when several are given.
  const links = tags(item, "link");
  const alternate = links.find((t) => /^(|alternate)$/i.test(attr(t, "rel"))) ?? links[0];
  return alternate ? attr(alternate, "href").trim() : "";
}

function published(item: string): string {
  for (const name of ["pubDate", "published", "dc:date", "updated"]) {
    const raw = text(inner(item, name)).trim();
    if (!raw) continue;
    const iso = isoDate(raw);
    if (iso) return iso;
  }
  return "";
}

export function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];
  const items: FeedItem[] = [];
  for (const block of blocks) {
    const title = headline(text(inner(block, "title")));
    const url = cleanUrl(link(block));
    if (!title || !url) continue;
    const categories = (block.match(/<category(?:\s[^>]*)?>[\s\S]*?<\/category>/gi) ?? [])
      .map((c) => plain(text(c.replace(/^<[^>]+>|<\/category>$/gi, ""))))
      .filter(Boolean);
    items.push({ title, url, image: image(block), publishedAt: published(block), categories });
  }
  return items;
}

/** The page's share picture (og:image, then twitter:image), for feeds that carry none. */
export function shareImage(html: string): string {
  for (const tag of html.slice(0, 200_000).match(/<meta\s[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
    if (key !== "og:image" && key !== "og:image:secure_url" && key !== "twitter:image") continue;
    const url = attr(tag, "content").trim();
    if (usable(url)) return url;
  }
  return "";
}
