// netlify/functions/feeds/__tests__/coffee.test.ts — the coffee feed against saved WordPress REST responses, RSS feeds
// and an article page, from the six publishers in PAPERS. The clock is the feed's own schedule, 05:00 UTC.
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { coffee } from "../sources.ts";
import { READER } from "../lib.ts";
import { fakeDb, frozenAt, json, quiet, respond, upstream, urls, fixture, type Answer } from "./harness.ts";

const WP = "/wp-json/wp/v2/posts?per_page=8&_embed=wp:featuredmedia&_fields=title,link,date_gmt,_links,_embedded";
const U = {
  sprudgeJson: `https://sprudge.com${WP}`,
  sprudgeRss: "https://sprudge.com/feed",
  dcnRss: "https://dailycoffeenews.com/feed/",
  pdgJson: `https://perfectdailygrind.com${WP}`,
  bmJson: `https://www.baristamagazine.com${WP}`,
  bmRss: "https://www.baristamagazine.com/feed/",
  fcJson: `https://freshcup.com${WP}&categories_exclude=14255`,
  bsJson: `https://www.beanscenemag.com.au${WP}`,
  championPage: "https://www.baristamagazine.com/meet-the-2026-u-s-barista-champion/",
  throwdownPage: "https://www.baristamagazine.com/latte-art-throwdown-returns-to-seattle/",
};

/** Every publisher answering as it usually does; Barista Magazine's firewall turns the JSON request away, so it is read by RSS. */
const PUBLISHERS: Record<string, Answer> = {
  [U.sprudgeJson]: "wp-sprudge.json",
  [U.dcnRss]: "rss-dailycoffeenews.xml",
  [U.pdgJson]: "wp-perfectdailygrind.json",
  [U.bmJson]: () => respond(fixture("firewall-challenge.html"), 403),
  [U.bmRss]: "rss-baristamagazine.xml",
  [U.fcJson]: "wp-freshcup.json",
  [U.bsJson]: "wp-beanscene.json",
  // The RSS items carry no picture: the feed reads each article's share picture instead.
  [U.championPage]: "page-baristamagazine.html",
  [U.throwdownPage]: 404,
};

const setup = (t: TestContext) => {
  frozenAt(t, "2026-10-11T05:00:00Z");
  return quiet(t);
};

const item = (source: string, title: string, url: string, image: string, publishedAt: string) => ({ source, title, url, image, publishedAt });
const F1 = item("Fresh Cup", "Inside the Rise of Coffee Subscriptions", "https://freshcup.com/inside-the-rise-of-coffee-subscriptions/", "https://freshcup.com/wp-content/uploads/2026/10/subscription-boxes-300x200.jpg", "2026-10-10T21:00:00.000Z");
const S2 = item("Sprudge", "The Sprudge Guide To Coffee In Lisbon", "https://sprudge.com/the-sprudge-guide-to-coffee-in-lisbon-298765.html", "https://sprudge.com/wp-content/uploads/2026/10/lisbon-cafe-hero-150x150.jpg", "2026-10-10T15:30:00.000Z");
const P2 = item("Perfect Daily Grind", "How are roasters responding to rising green coffee prices?", "https://perfectdailygrind.com/2026/10/how-are-roasters-responding-to-rising-green-coffee-prices/", "https://perfectdailygrind.com/wp-content/uploads/2026/10/green-coffee-prices-300x300.webp", "2026-10-10T08:00:00.000Z");
const D2 = item("Daily Coffee News", "Hilltop Roasters Opens Training Center in Rogers", "https://dailycoffeenews.com/2026/10/09/hilltop-roasters-opens-training-center-in-rogers/", "https://dailycoffeenews.com/wp-content/uploads/2026/10/hilltop-training-300x200.jpg", "2026-10-09T17:20:00.000Z");
const B2 = item("Barista Magazine", "Meet the 2026 U.S. Barista Champion", U.championPage, "https://www.baristamagazine.com/wp-content/uploads/2026/10/usbc-2026-champion-1200x800.jpg", "2026-10-09T12:00:00.000Z");
const BS = item("BeanScene", "Australian Barista Championship heads to Melbourne", "https://www.beanscenemag.com.au/australian-barista-championship-heads-to-melbourne/", "https://www.beanscenemag.com.au/wp-content/uploads/2026/10/abc-stage-150x150.jpg", "2026-10-09T02:00:00.000Z");
const S3 = item("Sprudge", "A Closer Look At The Grinder Everyone’s Talking About", "https://sprudge.com/a-closer-look-at-the-grinder-everyones-talking-about-298702.html", "https://sprudge.com/wp-content/uploads/2026/10/grinder-closeup-150x150.jpg", "2026-10-08T14:00:00.000Z");
const B3 = item("Barista Magazine", "Latte Art Throwdown Returns to Seattle", U.throwdownPage, "", "2026-10-07T16:00:00.000Z");
const P3 = item("Perfect Daily Grind", "Exploring anaerobic processing in Colombia", "https://perfectdailygrind.com/2026/10/exploring-anaerobic-processing-in-colombia/", "https://perfectdailygrind.com/wp-content/uploads/2026/10/anaerobic-tanks-300x300.webp", "2026-10-06T10:00:00.000Z");

test("eight items, newest first by paper: round-ups, BeanScene's franchise news and anything past 14 days left out", async (t) => {
  const { log } = setup(t);
  const sent = upstream(t, PUBLISHERS);
  const fake = fakeDb();

  const note = await coffee(fake.db);

  assert.equal(note, "Sprudge 3 · Daily Coffee News 3 · Perfect Daily Grind 3 · Barista Magazine 3 · Fresh Cup 2 · BeanScene 5");
  assert.deepEqual(log.mock.calls.map((c) => c.arguments), [[`feed coffee: ${note}`]]);
  assert.deepEqual(fake.ops(), ["coffee.insertMany", "coffee.deleteMany"]);
  // One per paper first (a different paper in each of the three places the card shows), then a second round: Sprudge
  // and Barista Magazine get a second item, BeanScene's cap is 1, and Perfect Daily Grind's older one misses the cut of 8.
  // Barista Magazine's RSS has no pictures: the first gets its article's og:image, the second's page is gone, so none.
  assert.deepEqual(fake.list("coffee"), [F1, S2, P2, D2, B2, BS, S3, B3]);
  assert.deepEqual(urls(sent), [U.sprudgeJson, U.dcnRss, U.pdgJson, U.bmJson, U.fcJson, U.bsJson, U.bmRss, U.championPage, U.throwdownPage]);
  assert.ok(sent.every((s) => s.headers["user-agent"] === READER["User-Agent"]), "publishers' firewalls see the feed's own name");
});

test("a WordPress answer with no posts, or a page where JSON was expected, falls back to the paper's RSS", async (t) => {
  setup(t);
  const sent = upstream(t, {
    ...PUBLISHERS,
    [U.sprudgeJson]: () => json([]),
    [U.sprudgeRss]: "rss-sprudge.xml",
    // A firewall that answers 200 with its challenge page.
    [U.bmJson]: () => respond(fixture("firewall-challenge.html"), 200),
  });
  const fake = fakeDb();

  const note = await coffee(fake.db);

  assert.equal(note, "Sprudge 2 · Daily Coffee News 3 · Perfect Daily Grind 3 · Barista Magazine 3 · Fresh Cup 2 · BeanScene 5");
  assert.ok(urls(sent).includes(U.sprudgeRss) && urls(sent).includes(U.bmRss));
  // The same stories, with the RSS item's picture (the full-size upload, not the avatar listed first).
  assert.deepEqual(fake.list("coffee"), [
    F1,
    { ...S2, image: "https://sprudge.com/wp-content/uploads/2026/10/lisbon-cafe-hero.jpg" },
    P2, D2, B2, BS,
    { ...S3, image: "https://sprudge.com/wp-content/uploads/2026/10/grinder-closeup.jpg" },
    B3,
  ]);
});

test("a paper that fails both ways, or by RSS alone, is noted as failed and the others are still written", async (t) => {
  setup(t);
  upstream(t, {
    ...PUBLISHERS,
    [U.sprudgeJson]: 500,
    [U.sprudgeRss]: () => {
      throw new TypeError("fetch failed");
    },
    [U.dcnRss]: 503,
  });
  const fake = fakeDb();

  const note = await coffee(fake.db);

  assert.equal(note, "Sprudge failed · Daily Coffee News failed · Perfect Daily Grind 3 · Barista Magazine 3 · Fresh Cup 2 · BeanScene 5");
  assert.deepEqual(fake.list("coffee"), [F1, P2, B2, BS, B3, P3]);
});

test("fewer than three items keeps the previous list, and the error says which papers answered", async (t) => {
  setup(t);
  const sent = upstream(t, (url) => (url === U.fcJson ? "wp-freshcup.json" : 503));
  const fake = fakeDb();

  await assert.rejects(coffee(fake.db), {
    message:
      "only 1 coffee items (Sprudge failed · Daily Coffee News failed · Perfect Daily Grind failed · Barista Magazine failed · Fresh Cup 2 · BeanScene failed); keeping the previous list",
  });
  assert.deepEqual(fake.calls, []);
  assert.ok(!urls(sent).some((u) => !u.includes("/wp-json/") && !u.includes("/feed")), "no article page is read for a run that is given up");
});
