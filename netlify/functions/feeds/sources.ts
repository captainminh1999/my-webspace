// One function per feed, mirroring .github/workflows/fetch-*.yml step for step.
import type { Db } from "mongodb";
import { READER, getJson, getText, imageSize, requireEnv, writeCollection, writeSingleton } from "./lib";
import { fromWordPress, selectReading, type Article } from "../../../src/utils/papers";
import { parseFeed, shareImage } from "../../../src/utils/rss";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const NEWS_TRIM = (articles: Any[]) =>
  articles.map((a) => ({
    title: a.title || "",
    url: a.url || "",
    image: a.urlToImage || "",
    publishedAt: a.publishedAt || "",
  }));

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

const DRONE_BANNED = ["military", "attack", "atttack", "russia", "ukraine", "strike", "strikes", "war", "dick"];

export async function drones(db: Db) {
  const q = 'drone OR drones OR fpv OR "dji avata" OR "dji mavic"';
  const src = await getJson<Any>(
    `https://newsapi.org/v2/everything?qInTitle=${encodeURIComponent(q)}&pageSize=5&sortBy=publishedAt&apiKey=${requireEnv("NEWSAPI_KEY")}`,
  );
  if (!Array.isArray(src?.articles)) throw new Error("unexpected NewsAPI payload");
  const kept = src.articles.filter((a: Any) => !DRONE_BANNED.some((b) => (a.title || "").toLowerCase().includes(b)));
  await writeCollection(db, "droneNews", NEWS_TRIM(kept));
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
