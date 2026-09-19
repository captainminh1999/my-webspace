// One function per feed, mirroring .github/workflows/fetch-*.yml step for step.
import type { Db } from "mongodb";
import { READER, getJson, getText, imageSize, requireEnv, writeCollection, writeSingleton } from "./lib";
import { fromWordPress, selectReading, type Article } from "../../../src/utils/papers";
import { headline, parseFeed, shareImage } from "../../../src/utils/rss";
import { dayNumber, joinContent, parseReference, rotate, sydneyDate, type Reference } from "../../../src/utils/verse";
import { METHODS } from "../../../src/utils/reflection";
import { scripture } from "../../../src/utils/scripture";
import type { VerseData, VerseSegment } from "../../../src/types/verse";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function weather(db: Db) {
  const src = await getJson<Any>(
    `https://api.openweathermap.org/data/3.0/onecall?lat=-33.87&lon=151.21&units=metric&exclude=minutely,alerts&appid=${requireEnv("WEATHER_KEY")}`,
  );
  if (!src?.current || !Array.isArray(src.hourly) || !Array.isArray(src.daily)) throw new Error("unexpected OpenWeather payload");
  await writeSingleton(db, "weather", {
    updated: Math.floor(Date.now() / 1000),
    current: { temp: src.current.temp, icon: src.current.weather[0].icon },
    hourly: src.hourly.slice(0, 12).map((h: Any) => ({ dt: h.dt, temp: h.temp, icon: h.weather[0].icon })),
    daily: src.daily.slice(0, 7).map((d: Any) => ({ dt: d.dt, min: d.temp.min, max: d.temp.max, icon: d.weather[0].icon })),
  });
}

export async function tech(db: Db) {
  const ids = (await getJson<number[]>("https://hacker-news.firebaseio.com/v0/topstories.json")).slice(0, 10);
  const items = await Promise.all(ids.map((id) => getJson<Any>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)));
  await writeCollection(
    db,
    "tech",
    items.filter(Boolean).map((s) => ({ id: s.id, title: s.title, url: s.url ?? null, score: s.score ?? null })),
  );
}

// The coffee card reads specialty-coffee publishers directly: the publisher is the filter.
// WordPress JSON where the site offers it (it carries a square thumbnail), RSS otherwise and as the way back in.
const WP = "/wp-json/wp/v2/posts?per_page=8&_embed=wp:featuredmedia&_fields=title,link,date_gmt,_links,_embedded";
const PAPERS: { source: string; json?: string; thumb?: string; rss?: string }[] = [
  { source: "Sprudge", json: `https://sprudge.com${WP}`, rss: "https://sprudge.com/feed" },
  // Its robots.txt asks readers to stay off query-string URLs, so RSS only.
  { source: "Daily Coffee News", rss: "https://dailycoffeenews.com/feed/" },
  { source: "Perfect Daily Grind", json: `https://perfectdailygrind.com${WP}`, thumb: "thumblist", rss: "https://perfectdailygrind.com/feed/" },
  { source: "Barista Magazine", json: `https://www.baristamagazine.com${WP}`, rss: "https://www.baristamagazine.com/feed/" },
  // 14255 is Fresh Cup's "Sponsored" category.
  { source: "Fresh Cup", json: `https://freshcup.com${WP}&categories_exclude=14255`, rss: "https://freshcup.com/feed/" },
  { source: "BeanScene", json: `https://www.beanscenemag.com.au${WP}`, rss: "https://www.beanscenemag.com.au/feed/" },
];

async function readPaper(paper: (typeof PAPERS)[number]): Promise<Article[]> {
  // One deadline for both tries, so a site that lets the connection hang cannot take two full timeouts out of the run's 30 s.
  const deadline = AbortSignal.timeout(10_000);
  if (paper.json) {
    try {
      const posts = fromWordPress(await getJson(paper.json, { headers: READER, signal: deadline }), paper.source, paper.thumb);
      if (posts.length) return posts;
    } catch (err) {
      if (!paper.rss) throw err;
    }
  }
  if (!paper.rss) return [];
  return parseFeed(await getText(paper.rss, deadline)).map(({ title, url, image, publishedAt }) => ({ source: paper.source, title, url, image, publishedAt }));
}

export async function coffee(db: Db) {
  const read = await Promise.allSettled(PAPERS.map(readPaper));
  // Which papers answered goes into meta.lastRun: a publisher's firewall turning the function away shows up there, not only in the log.
  const note = read.map((r, i) => `${PAPERS[i].source} ${r.status === "fulfilled" ? r.value.length : "failed"}`).join(" · ");
  console.log(`feed coffee: ${note}`);
  const picked = selectReading(read.flatMap((r) => (r.status === "fulfilled" ? r.value : [])), {
    count: 8,
    days: 14,
    // BeanScene is the Australian trade paper, and half of it is franchise news: one item at most, and only when it is about coffee.
    caps: { BeanScene: 1 },
    only: {
      BeanScene: {
        keep: /coffee|caf[eé]|barista|roast|espresso|brew|latte|milk|championship|v60/i,
        drop: /\b(kfc|mcdonald|soul origin|hungry jack|franchise|energy drink)|^innovation in focus/i,
      },
    },
  });
  if (picked.length < 3) throw new Error(`only ${picked.length} coffee items (${note}); keeping the previous list`);
  // A feed without pictures (an RSS fallback) gets each article's share picture instead — briefly, the 30 s are nearly spent by then.
  const items = await Promise.all(
    picked.map(async (a) => (a.image ? a : { ...a, image: await getText(a.url, 4_000).then(shareImage, () => "") })),
  );
  await writeCollection(db, "coffee", items);
  return note;
}

// ---- Verse of the day ------------------------------------------------------------------------------
// BibleGateway chooses the verse (the NET Bible's verse of the day stands in when it cannot be reached). The translation
// changes daily. NIV, KJV, ESV and NLT are the ones BibleGateway's documented verse-of-the-day service itself serves; its
// JSON also answers for versions that service refuses "due to copyright issues", so nothing else is taken from it.
// BSB is public domain and comes from bible.helloao.org by reference. The notices are the publishers' own wording:
// upstream sends an empty copyright field.
interface Translation {
  code: string;
  name: string;
  notice: string;
  publicDomain: boolean;
  via: "biblegateway" | "helloao" | "netbible";
}
const KJV: Translation = { code: "KJV", name: "King James Version", notice: "King James Version (1611; the text of 1769). Public domain outside the United Kingdom.", publicDomain: true, via: "biblegateway" };
const NET: Translation = {
  code: "NET",
  name: "New English Translation",
  notice: "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. http://netbible.com All rights reserved.",
  publicDomain: false,
  via: "netbible",
};
const TRANSLATIONS: readonly Translation[] = [
  {
    code: "NIV",
    name: "New International Version",
    notice: "Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.",
    publicDomain: false,
    via: "biblegateway",
  },
  KJV,
  {
    code: "ESV",
    name: "English Standard Version",
    notice: "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. ESV Text Edition: 2025. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated in whole or in part into any other language. Used by permission. All rights reserved.",
    publicDomain: false,
    via: "biblegateway",
  },
  {
    code: "NLT",
    name: "New Living Translation",
    notice: "Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc., Carol Stream, Illinois 60188. All rights reserved.",
    publicDomain: false,
    via: "biblegateway",
  },
  { code: "BSB", name: "Berean Standard Bible", notice: "Berean Standard Bible. Public domain.", publicDomain: true, via: "helloao" },
];

const BIBLEGATEWAY = "https://www.biblegateway.com";

/** The verses of a reference in the Berean Standard Bible; throws when any of them cannot be read. */
async function berean(ref: Reference): Promise<VerseSegment[]> {
  const chapter = await getJson<Any>(`https://bible.helloao.org/api/BSB/${ref.usfm}/${ref.chapter}.json`, { headers: READER });
  const rows: Any[] = Array.isArray(chapter?.chapter?.content) ? chapter.chapter.content : [];
  return ref.verses.map((number) => {
    const text = joinContent(rows.find((r) => r?.type === "verse" && r.number === number)?.content);
    if (!text) throw new Error("unexpected helloao payload");
    return { number, text };
  });
}

export async function verse(db: Db) {
  const date = sydneyDate();
  const day = dayNumber(date);
  const wanted = rotate(TRANSLATIONS, day);
  const method = rotate(METHODS, day, true);

  let reference: string;
  let text: string;
  let verses: VerseSegment[] | undefined;
  let translation = wanted;
  let source = "BibleGateway.com";
  let sourceUrl = BIBLEGATEWAY;
  try {
    // On a BSB day only the reference is wanted, so the by-product text asked for is a public-domain one.
    const asked = wanted.via === "biblegateway" ? wanted : KJV;
    const bg = await getJson<Any>(`${BIBLEGATEWAY}/votd/get/?format=json&version=${asked.code}`, { headers: READER });
    // Its errors arrive as HTTP 200 with an `error` key.
    if (bg?.error || !bg?.votd?.reference || !bg.votd.content) throw new Error("unexpected BibleGateway payload");
    reference = headline(String(bg.votd.reference));
    text = scripture(String(bg.votd.content));
    translation = asked;
    const parsed = wanted.via === "helloao" ? parseReference(reference) : null;
    if (parsed) {
      // A reference it cannot take verse by verse, or a resolver that is down, leaves the day in the King James.
      verses = await berean(parsed).catch(() => undefined);
      if (verses) {
        text = verses.map((v) => v.text).join(" ");
        translation = wanted;
      }
    }
    // For "Romans 8:35,37" BibleGateway sends the first part only; the citation must name what is quoted.
    if (!verses && reference.includes(",")) reference = reference.split(",")[0].trim();
  } catch (err) {
    console.warn("feed verse: BibleGateway did not answer, asking the NET Bible", err instanceof Error ? err.message : err);
    const rows = await getJson<Any[]>("https://labs.bible.org/api/?passage=votd&type=json", { headers: READER });
    if (!Array.isArray(rows) || !rows.length || !rows.every((r) => r?.bookname && r.chapter && r.verse && r.text)) throw new Error("unexpected NET Bible payload");
    const [first, last] = [rows[0], rows[rows.length - 1]];
    reference = `${first.bookname} ${first.chapter}:${first.verse}${last.verse !== first.verse ? `-${last.verse}` : ""}`;
    verses = rows.map((r) => ({ number: Number(r.verse), text: scripture(String(r.text)) }));
    text = verses.map((v) => v.text).join(" ");
    translation = NET;
    source = "NET Bible";
    sourceUrl = "https://netbible.org";
  }

  // Scripture is stored whole or not at all: anything that looks cut, empty or still encoded keeps yesterday's verse.
  // (The shortest verse there is, "Jesus wept.", is 11 characters.)
  if (!reference || text.length < 8 || text.length > 1500 || /&[a-z#0-9]+;|</i.test(text)) throw new Error("unexpected verse payload");

  const parsed = parseReference(reference);
  const book = parsed?.book ?? reference.replace(/\s+\d+(?::.*)?$/, "");
  const chapter = parsed?.chapter ?? (Number(reference.match(/\s(\d+)(?::|$)/)?.[1]) || 0);
  // Links are built here from the reference, never pasted from upstream. BibleGateway has no BSB; Bible Hub does.
  const passage = (search: string) => `${BIBLEGATEWAY}/passage/?search=${encodeURIComponent(search)}&version=${translation.code}`;
  const bsbChapter = parsed && `https://biblehub.com/bsb/${parsed.usfm === "SNG" ? "songs" : parsed.name.toLowerCase().replace(/ /g, "_")}/${parsed.chapter}.htm`;
  const chapterUrl = translation.code === "BSB" && bsbChapter ? bsbChapter : passage(chapter ? `${book} ${chapter}` : reference);

  const doc: VerseData = {
    date,
    reference,
    book,
    chapter,
    text,
    ...(verses && verses.length > 1 ? { verses } : {}),
    translation: translation.code,
    translationName: translation.name,
    notice: translation.notice,
    publicDomain: translation.publicDomain,
    passageUrl: translation.code === "BSB" ? chapterUrl : passage(reference),
    chapterUrl,
    questions: [...method.questions],
    method: method.name,
    methodNote: method.note,
    source,
    sourceUrl,
  };
  // The second run of the morning is there to repair a failed first one, never to swap a good verse for a stand-in.
  if (translation !== wanted) {
    const stored = await db.collection<{ _id: string }>("singletons").findOne({ _id: "verse" }).catch(() => null) as Partial<VerseData> | null;
    if (stored?.date === date && stored.translation === wanted.code) {
      return `kept this morning's ${stored.reference} · ${stored.translation} (this run got ${translation.code} via ${source})`;
    }
  }
  // One document, replaced whole: no archive of past verses, which is also what the publishers' terms expect.
  await writeSingleton(db, "verse", doc);
  return `${reference} · ${translation.code}${translation === wanted ? "" : ` (wanted ${wanted.code})`} · via ${source} · ${method.name}`;
}

export async function games(db: Db) {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400e3);
  const src = await getJson<Any>(
    `https://api.rawg.io/api/games?key=${requireEnv("RAWG_KEY")}&dates=${day(start)},${day(end)}&ordering=-rating&page_size=10`,
  );
  if (!Array.isArray(src?.results)) throw new Error("unexpected RAWG payload");
  await writeCollection(
    db,
    "games",
    src.results.map((g: Any) => ({ id: g.id, name: g.name, thumbnail: g.background_image, released: g.released })),
  );
}

export async function space(db: Db) {
  const key = requireEnv("NASA_KEY");
  // Both fetches first, in parallel, so a failed EPIC call cannot leave a new APOD under an old stamp.
  const [apod, epicList] = await Promise.all([
    getJson<Any>(`https://api.nasa.gov/planetary/apod?api_key=${key}&thumbs=true`),
    getJson<Any[]>(`https://api.nasa.gov/EPIC/api/natural?api_key=${key}`),
  ]);
  if (!apod?.date) throw new Error("unexpected APOD payload");
  const epic = epicList?.[0];
  if (!epic?.image) throw new Error("unexpected EPIC payload");
  const [ymd] = String(epic.date).split(" ");
  // The picture the dashboard will show (a video's thumbnail on video days), measured so it can be framed to its own shape.
  const shown = apod.media_type === "image" ? apod.url : apod.thumbnail_url;
  const size = shown ? await imageSize(shown) : null;
  await writeSingleton(db, "space", { ...apod, ...(size ?? {}) });
  await writeSingleton(db, "epic", {
    date: epic.date,
    image: epic.image,
    caption: epic.caption,
    // Public archive, no key in the stored URL.
    url: `https://epic.gsfc.nasa.gov/archive/natural/${ymd.replace(/-/g, "/")}/png/${epic.image}.png`,
  });
}

export async function camera(db: Db) {
  const src = await getJson<Any>(`https://api.unsplash.com/photos/random?orientation=landscape&client_id=${requireEnv("UNSPLASH_KEY")}`);
  if (!src?.id) throw new Error("unexpected Unsplash payload");
  await writeSingleton(db, "photography", {
    id: src.id,
    thumbnail: src.urls.small,
    full: src.urls.full,
    width: src.width,
    height: src.height,
    photographer: src.user.name,
    profile: src.user.links.html,
    alt: src.alt_description || "",
    createdAt: src.created_at,
  });
}

const CHANNELS = [
  "UCHnyfMqiRRG1u-2MsSQLbXA",
  "UCsXVk37bltHxD1rDPwtNM8Q",
  "UCo4K5kzinPI9AHRDp_V4T0w",
  "UCMb0O2CdPBNi-QqPk5T3gsQ",
  "UCXuqSBlHAE6Xw-yeJA0Tunw",
  "UCcyq283he07B7_KUX07mmtA",
  "UCKy1dAqELo0zrOtPkf0eTMw",
  "UC1D3yD4wlPMico0dss264XA",
  "UCftwRNsjfRo08xYE31tkiyw",
];

export async function youtube(db: Db) {
  const key = requireEnv("YOUTUBE_KEY");
  const results = await Promise.all(
    CHANNELS.map((channelId) =>
      getJson<Any>(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${key}`,
      ).then((r) => {
        const it = r?.items?.[0];
        return it?.id?.videoId
          ? {
              channelId,
              videoId: it.id.videoId,
              title: it.snippet.title,
              thumbnail: it.snippet.thumbnails?.medium?.url ?? "",
              channelTitle: it.snippet.channelTitle,
              publishedAt: it.snippet.publishedAt,
            }
          : null;
      }),
    ),
  );
  const items = results.filter(Boolean);
  if (!items.length) throw new Error("no YouTube results");
  await writeSingleton(db, "youtubeRecs", { items });
}
