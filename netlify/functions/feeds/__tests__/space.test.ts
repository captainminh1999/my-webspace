// netlify/functions/feeds/__tests__/space.test.ts — the space feed against saved NASA APOD (thumbs=true) and EPIC responses,
// and the first bytes of the day's picture, which the feed reads for its size.
import { test } from "node:test";
import assert from "node:assert/strict";
import { space } from "../sources.ts";
import { answer, fakeDb, file, fixtureJson, json, replaced, upstream, urls, withEnv, type Answer } from "./harness.ts";

const KEY = "test-nasa-key";
const APOD = `https://api.nasa.gov/planetary/apod?api_key=${KEY}&thumbs=true`;
const EPIC = `https://api.nasa.gov/EPIC/api/natural?api_key=${KEY}`;
const PICTURE = "https://apod.nasa.gov/apod/image/2610/NGC7000_Doe_1080.jpg";
const THUMBNAIL = "https://img.youtube.com/vi/aBcD3fGh1jK/0.jpg";

const EPIC_DOC = {
  date: "2026-10-09 00:31:45",
  image: "epic_1b_20261009003633",
  caption: "This image was taken by NASA's EPIC camera onboard the NOAA DSCOVR spacecraft",
  // The public archive, by the image's own date: no key in a stored URL.
  url: "https://epic.gsfc.nasa.gov/archive/natural/2026/10/09/png/epic_1b_20261009003633.png",
};

test("an image day: APOD stored whole with the picture's pixel size, and the first EPIC image of the day", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const sent = upstream(t, {
    [APOD]: "apod-image.json",
    [EPIC]: "epic-natural.json",
    // A server that honours Range answers 206 — here with the whole file, which is smaller than the range.
    [PICTURE]: () => file("apod-image.jpg", 206),
  });
  const fake = fakeDb();

  await space(fake.db);

  assert.deepEqual(urls(sent), [APOD, EPIC, PICTURE]);
  assert.equal(sent[2].headers.range, "bytes=0-262143", "only the first bytes of the picture are asked for");
  assert.deepEqual(fake.calls, [replaced("space", { ...fixtureJson("apod-image.json"), width: 1080, height: 720 }), replaced("epic", EPIC_DOC)]);
});

test("a video day measures the video's thumbnail; one that cannot be read leaves the size out", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const sent = upstream(t, { [APOD]: "apod-video.json", [EPIC]: "epic-natural.json", [THUMBNAIL]: 404 });
  const fake = fakeDb();

  await space(fake.db);

  assert.deepEqual(urls(sent), [APOD, EPIC, THUMBNAIL], "the thumbnail, not the embedded player");
  assert.deepEqual(fake.calls, [replaced("space", fixtureJson("apod-video.json")), replaced("epic", EPIC_DOC)]);
});

test("a failed or empty EPIC answer fails the run before anything is written, so a new APOD never sits under an old stamp", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  let epic: Answer = 200;
  const sent = upstream(t, { [APOD]: "apod-image.json", [EPIC]: () => answer(epic), [PICTURE]: "apod-image.jpg" });

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

test("an APOD answer without a date, or a refused key, writes nothing", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  let apod: Answer = 200;
  upstream(t, { [APOD]: () => answer(apod), [EPIC]: "epic-natural.json" });

  const cases: [Answer, RegExp][] = [
    // What APOD answers when asked for a `count`: a list, not a day.
    [() => json([fixtureJson("apod-image.json")]), /^Error: unexpected APOD payload: no date$/],
    [() => json({ code: 400, msg: "Date must be between Jun 16, 1995 and Oct 11, 2026.", service_version: "v1" }), /^Error: unexpected APOD payload: no date$/],
    [() => json({ error: { code: "OVER_RATE_LIMIT", message: "You have exceeded your rate limit. Try again later." } }, 429), /^Error: 429 Too Many Requests from api\.nasa\.gov$/],
  ];
  for (const [response, error] of cases) {
    apod = response;
    const fake = fakeDb();
    await assert.rejects(space(fake.db), error);
    assert.deepEqual(fake.calls, []);
  }
});

test("the 2026-10-10 answer, the APOD page's site header instead of the picture, is refused before anything is measured or written", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const LOGO = "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png";
  const sent = upstream(t, {
    [APOD]: () => json({ ...fixtureJson("apod-image.json"), title: "NASA Science", url: LOGO, hdurl: LOGO }),
    [EPIC]: "epic-natural.json",
    [LOGO]: "apod-image.jpg",
  });
  const fake = fakeDb();

  await assert.rejects(space(fake.db), /^Error: unexpected APOD payload: the title is the site's name \("NASA Science"\)$/);
  assert.deepEqual(urls(sent), [APOD, EPIC], "the logo is never measured");
  assert.deepEqual(fake.calls, []);
});

test("the next day's teaser on the end of the explanation is cut before it is stored", async (t) => {
  withEnv(t, { NASA_KEY: KEY });
  const day = fixtureJson("apod-image.json");
  upstream(t, {
    [APOD]: () => json({ ...day, explanation: `${day.explanation}Tomorrow's picture: Sunday's Childe\t\t\t` }),
    [EPIC]: "epic-natural.json",
    [PICTURE]: "apod-image.jpg",
  });
  const fake = fakeDb();

  await space(fake.db);

  assert.deepEqual(fake.calls[0], replaced("space", { ...day, width: 1080, height: 720 }));
});

test("without NASA_KEY nothing is asked for", async (t) => {
  withEnv(t, { NASA_KEY: undefined });
  const sent = upstream(t, {});
  await assert.rejects(space(fakeDb().db), /^Error: NASA_KEY is not set$/);
  assert.deepEqual(sent, []);
});
