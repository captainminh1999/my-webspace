// The space card's picture of the day. In October 2026 APOD moved from apod.nasa.gov to science.nasa.gov/apod, and
// every apod.nasa.gov address (the pictures too) now redirects to the new section's front page. NASA's APOD API
// (api.nasa.gov/planetary/apod) builds its answer by reading the old pages, so since the move (first stored on
// 2026-10-10) it has answered for every day, past ones included, with the new page's site header: title "NASA
// Science", url and hdurl the science.nasa.gov logo. The feed now reads the section's own RSS feed (APOD_FEED) and
// turns its latest day into the API's shape, which is what singletons/space has always held. An answer that looks
// like that header is still refused, so the card keeps the last good picture and the run record says why
// (netlify/functions/feeds/sources.ts → space).
import { headline, inner, text } from "./rss.ts";

export type ApodPayload = Record<string, unknown>;

/** APOD's feed on science.nasa.gov: the last 30 days, each with the fields the API used to give, plus the day's page. */
export const APOD_FEED = "https://science.nasa.gov/feed/apod-basic/";

/** Where the new APOD keeps its pictures. */
const PICTURE_HOST = "assets.science.nasa.gov";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DAY = new RegExp(`(\\d{4})[\\s-]+(${MONTHS.join("|")})[\\s-]+(\\d{1,2})(?!\\d)`, "i");

/** YYYY-MM-DD from the first of these that names a day: ".../apod-2026-october-23-andromeda.../" or "2026 October 23". */
function apodDate(...sources: string[]): string {
  for (const source of sources) {
    const m = source.match(DAY);
    if (m) return `${m[1]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  return "";
}

/** Feed HTML as one line of text: tags dropped without a gap ("your <em>ears</em>?" → "your ears?"), line breaks as spaces. */
const plainText = (html: string) => headline(html.replace(/<br\s*\/?>|<\/p>/gi, " ").replace(/<\/?[a-z][^<>]*>/gi, ""));

// Pictures are served from /dynamicimage/assets/science/…, a resizer that takes ?w=…&h=…, and the same file is at
// /content/dam/science/… as uploaded. The feed's hdurl is the resizer with the original's size in its query, except
// on days it says w=0&h=0, which the resizer reads as no size at all.
const RESIZER = "/dynamicimage/assets/science/";
const ORIGINAL = "/content/dam/science/";

/** The picture at the size the card needs. Without a size the resizer sends a JPEG at 1280 px but a PNG whole (38 MB on 2026-10-02). */
function shownPicture(hdurl: string): string {
  try {
    const u = new URL(hdurl);
    return u.hostname === PICTURE_HOST && u.pathname.startsWith(RESIZER) ? `${u.origin}${u.pathname}?w=1280&h=1280&fit=clip` : hdurl;
  } catch {
    return hdurl;
  }
}

/** The file as uploaded, for the "HD image" link. */
function originalPicture(hdurl: string): string {
  try {
    const u = new URL(hdurl);
    return u.hostname === PICTURE_HOST && u.pathname.startsWith(RESIZER) ? `${u.origin}${ORIGINAL}${u.pathname.slice(RESIZER.length)}` : hdurl;
  } catch {
    return hdurl;
  }
}

// APOD's stock alt text, written for its own page: it describes what clicking or hovering there does, not the picture.
const STOCK_ALT = /^see explanation\b|\bclick(?:ing)?\b|\bcursor\b/i;

/**
 * The latest day in APOD's feed, in the API's shape (date, title, explanation, media_type, url, hdurl or
 * thumbnail_url, copyright, alt), or null. The latest day is the feed's first; when its date cannot be read the
 * answer carries no date, so the run fails (apodProblem) rather than storing an older day as if it were today's.
 */
export function fromApodFeed(xml: string): ApodPayload | null {
  const item = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/i)?.[0];
  if (!item) return null;
  const field = (name: string) => text(inner(item, name)).trim();
  const date = apodDate(field("link"), field("content:encoded"));

  // The explanation is the first paragraph. After a blank line APOD adds its notices ("APOD's main NASA site has
  // moved", "Your Sky Surprise: …") and the teaser for the next day. Its label can come twice ("Explanation:
  // Explanation : What is…").
  const [explanation] = (field("apod:explanation") || field("description")).split(/<br\s*\/?>\s*<br\s*\/?>/i);
  const apod: ApodPayload = {
    date,
    title: headline(field("title")),
    explanation: cleanExplanation(plainText(explanation).replace(/^(?:Explanation\s*:\s*)+/i, "")),
  };
  const credit = plainText(field("apod:copyright") || field("apod:credit")).replace(/^Image Credit(?:\s*&\s*Copyright)?:\s*/i, "");
  if (credit) apod.copyright = credit;
  const alt = plainText(field("apod:alt"));
  if (alt && !STOCK_ALT.test(alt)) apod.alt = alt;

  // A video day embeds its player in the day's page; the feed's hdurl is then a still from it.
  const hdurl = field("apod:hdurl");
  const player = field("content:encoded").match(/<iframe\s[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (player) {
    apod.media_type = "video";
    apod.url = new URL(player, "https://science.nasa.gov/").toString();
    if (hdurl) apod.thumbnail_url = shownPicture(hdurl);
  } else if (hdurl) {
    apod.media_type = "image";
    apod.url = shownPicture(hdurl);
    apod.hdurl = originalPicture(hdurl);
  } else {
    apod.media_type = "other";
  }
  return apod;
}

const hostOf = (url: unknown): string | null => {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

/** Why this APOD day must not be stored, or null when it can be. Never names a full URL. */
export function apodProblem(apod: ApodPayload | null | undefined): string | null {
  if (!apod?.date) return "no date";
  const title = typeof apod.title === "string" ? apod.title.trim() : "";
  if (!title) return "no title";
  if (title === "NASA Science") return 'the title is the site\'s name ("NASA Science")';
  // APOD serves its own pictures (a video day's still too); the player comes from YouTube or Vimeo, and "other"
  // days (interactives) may have no picture at all.
  const pictures = apod.media_type === "image" ? ["url", "hdurl"] : apod.media_type === "video" ? ["thumbnail_url"] : [];
  for (const key of pictures) {
    if (key !== "url" && apod[key] == null) continue; // not every day has an HD version or a still
    const host = hostOf(apod[key]);
    if (host !== PICTURE_HOST) return `${key} is on ${host ?? "no host"}, not ${PICTURE_HOST}`;
  }
  return null;
}

/** The explanation without the teaser for the next day that APOD leaves on its end. */
export function cleanExplanation(explanation: string): string {
  return explanation.replace(/\s*Tomorrow's picture:[\s\S]*$/, "").trim();
}
