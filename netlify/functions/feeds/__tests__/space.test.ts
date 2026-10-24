// netlify/functions/feeds/__tests__/space.test.ts — the space feed against a saved APOD feed (science.nasa.gov's markup,
// invented days) and EPIC response, and the first bytes of the day's picture, which the feed reads for its size.
import { test } from "node:test";
import assert from "node:assert/strict";
import { space } from "../sources.ts";
import { answer, fakeDb, file, fixture, respond, replaced, json, upstream, urls, withEnv, type Answer } from "./harness.ts";

const KEY = "test-nasa-key";
const FEED = "https://science.nasa.gov/feed/apod-basic/";
const EPIC = `https://api.nasa.gov/EPIC/api/natural?api_key=${KEY}`;
const PICTURES = "https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october";
// The card's picture is the resizer's copy within 1280 px; the HD link is the file as uploaded.
const PICTURE = `${PICTURES}/NGC7000_Doe.jpg?w=1280&h=1280&fit=clip`;
const ORIGINAL = "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/NGC7000_Doe.jpg";
const STILL = `${PICTURES}/PillarsSonified.jpg?w=1280&h=1280&fit=clip`;
const xml = (body: string) => () => respond(body, 200, "application/rss+xml; charset=UTF-8");

const IMAGE_DAY = {
  date: "2026-10-23",
  title: "The North America Nebula",
  explanation:
    "What lights up the North America Nebula? Hydrogen gas, ionized by the light of young stars nearby, glows red where electrons and protons meet again.",
  copyright: "Jane Doe",
  alt: "A red nebula shaped like a continent.",
  media_type: "image",
  url: PICTURE,
  hdurl: ORIGINAL,
};

const VIDEO_DAY = {
  date: "2026-10-22",
  title: "Pillars, Sonified",
  explanation: "Have you ever heard a nebula with your ears? Brightness becomes pitch as a line sweeps across the pillars.",
  copyright: "NASA, ESA & J. Smith",
  alt: "Star-forming pillars with a sound graph over them.",
  media_type: "video",
  url: "https://www.youtube.com/embed/aBcD3fGh1jK?rel=0",
  thumbnail_url: STILL,
};

const EPIC_DOC = {
  date: "2026-10-09 00:31:45",
  image: "epic_1b_20261009003633",
  caption: "This image was taken by NASA's EPIC camera onboard the NOAA DSCOVR spacecraft",
  // The public archive, by the image's own date: no key in a stored URL.
  url: "https://epic.gsfc.nasa.gov/archive/natural/2026/10/09/png/epic_1b_20261009003633.png",
};

/** The saved feed without its first day, so the video day is the latest. */
const withoutFirstDay = () => fixture("apod-feed.xml").replace(/<item>[\s\S]*?<\/item>\s*/, "");

test("an image day: the feed's latest day stored in the API's shape with the picture's pixel size, and the first EPIC image of the day", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const sent = upstream(t, {
    [FEED]: "apod-feed.xml",
    [EPIC]: "epic-natural.json",
    // The resizer ignores Range and sends the whole picture, which is smaller than the range here.
    [PICTURE]: () => file("apod-image.jpg"),
  });
  const fake = fakeDb();

  await space(fake.db);

  assert.deepEqual(urls(sent), [FEED, EPIC, PICTURE]);
  assert.match(sent[0].headers["user-agent"], /nhatminh\.dev feed/, "the feed is asked for as the site's reader");
  assert.equal(sent[2].headers.range, "bytes=0-262143", "only the first bytes of the picture are asked for");
  assert.deepEqual(fake.calls, [replaced("space", { ...IMAGE_DAY, width: 1080, height: 720 }), replaced("epic", EPIC_DOC)]);
});

test("a video day measures the video's still; one that cannot be read leaves the size out", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const sent = upstream(t, { [FEED]: xml(withoutFirstDay()), [EPIC]: "epic-natural.json", [STILL]: 404 });
  const fake = fakeDb();

  await space(fake.db);

  assert.deepEqual(urls(sent), [FEED, EPIC, STILL], "the still, not the embedded player");
  assert.deepEqual(fake.calls, [replaced("space", VIDEO_DAY), replaced("epic", EPIC_DOC)]);
});

test("a failed or empty EPIC answer fails the run before anything is written, so a new APOD never sits under an old stamp", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  let epic: Answer = 200;
  const sent = upstream(t, { [FEED]: "apod-feed.xml", [EPIC]: () => answer(epic), [PICTURE]: "apod-image.jpg" });

  const cases: [Answer, RegExp][] = [
    [() => json([]), /^Error: unexpected EPIC payload$/],
    [() => json([{ identifier: "20261009003633", date: "2026-10-09 00:31:45" }]), /^Error: unexpected EPIC payload$/],
    [503, /^Error: 503 Service Unavailable from api\.nasa\.gov$/],
  ];
  for (const [response, error] of cases) {
    epic = response;
    sent.length = 0;
    const fake = fakeDb();
    await assert.rejects(space(fake.db), error);
    assert.deepEqual(fake.calls, []);
    assert.ok(!urls(sent).includes(PICTURE));
  }
});

test("a feed that fails, has no days, or cannot date its latest day writes nothing, even with older days dated", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  let feed: Answer = 200;
  upstream(t, { [FEED]: () => answer(feed), [EPIC]: "epic-natural.json" });

  const cases: [Answer, RegExp][] = [
    [503, /^Error: 503 Service Unavailable from science\.nasa\.gov$/],
    // What the section's front page is, should the feed's address ever answer with it.
    [() => respond("<!doctype html><html><head><title>APOD - NASA Science</title></head><body></body></html>"), /^Error: unexpected APOD payload: no date$/],
    [xml(fixture("apod-feed.xml").replace(/apod-2026-october-23-/g, "apod-").replaceAll("2026 October 23", "")), /^Error: unexpected APOD payload: no date$/],
  ];
  for (const [response, error] of cases) {
    feed = response;
    const fake = fakeDb();
    await assert.rejects(space(fake.db), error);
    assert.deepEqual(fake.calls, []);
  }
});

test("a day that looks like the site header the API gave from 2026-10-10 is refused before anything is measured or written", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const LOGO = "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png";
  const day = fixture("apod-feed.xml");
  let body = day;
  const sent = upstream(t, { [FEED]: () => xml(body)(), [EPIC]: "epic-natural.json", [LOGO]: "apod-image.jpg" });
  const cases: [string, RegExp][] = [
    [day.replace("<title>The North America Nebula</title>", "<title>NASA Science</title>"), /the title is the site's name \("NASA Science"\)$/],
    [day.replace(/<apod:hdurl>[^<]*<\/apod:hdurl>/, `<apod:hdurl>${LOGO}</apod:hdurl>`), /url is on science\.nasa\.gov, not assets\.science\.nasa\.gov$/],
  ];
  for (const [feed, error] of cases) {
    body = feed;
    sent.length = 0;
    const fake = fakeDb();
    await assert.rejects(space(fake.db), error);
    assert.deepEqual(urls(sent), [FEED, EPIC], "the logo is never measured");
    assert.deepEqual(fake.calls, []);
  }
});

test("without NASA_KEY nothing is asked for", async (t) => {
  withEnv(t, { NASA_KEY: undefined });
  const sent = upstream(t, {});
  await assert.rejects(space(fakeDb().db), /^Error: NASA_KEY is not set$/);
  assert.deepEqual(sent, []);
});
