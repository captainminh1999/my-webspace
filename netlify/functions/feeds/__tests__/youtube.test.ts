// netlify/functions/feeds/__tests__/youtube.test.ts — the youtube feed against saved YouTube Data API search.list responses
// (one per channel in CHANNELS) and the HEAD answers of i.ytimg.com for each video's larger thumbnails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { youtube } from "../sources.ts";
import { fakeDb, fixtureJson, json, replaced, upstream, urls, withEnv, type Answer } from "./harness.ts";

const KEY = "test-youtube-key";
const SEARCH = fixtureJson("youtube-search.json");
const CHANNELS = Object.keys(SEARCH);
const search = (channelId: string) =>
  `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${KEY}`;

// Which thumbnails exist: maxresdefault for most; one video only has sddefault, one has neither (hqdefault always
// exists, and is never asked about), and for one the request for maxresdefault fails outright.
const THUMBS: Record<string, Answer> = {
  "vRt7Qx2LmPk/maxresdefault": 200,
  "Kz8sN4qWd1E/maxresdefault": 200,
  "Hf3ePq9ZyXo/maxresdefault": 404,
  "Hf3ePq9ZyXo/sddefault": 200,
  "Lt4gQm2BvNs/maxresdefault": 200,
  "Cy5hWr7TkJa/maxresdefault": 404,
  "Cy5hWr7TkJa/sddefault": 404,
  "Ky6jXs8UlBb/maxresdefault": () => {
    throw new TypeError("fetch failed");
  },
  "Ky6jXs8UlBb/sddefault": 200,
  "Dz7kYt9VmCc/maxresdefault": 200,
  "Fw8lZu0WnDd/maxresdefault": 200,
};

/** The API's answers by channel (`answers` overrides some), and the thumbnails above. */
const youTube = (answers: Record<string, Answer> = {}) => (url: string, init: RequestInit): Answer | undefined => {
  const u = new URL(url);
  if (u.host === "www.googleapis.com") {
    const channelId = u.searchParams.get("channelId") ?? "";
    return answers[channelId] ?? (url === search(channelId) && channelId in SEARCH ? () => json(SEARCH[channelId]) : undefined);
  }
  const thumb = url.match(/^https:\/\/i\.ytimg\.com\/vi\/([\w-]{11}\/\w+)\.jpg$/)?.[1];
  return thumb && init.method === "HEAD" ? THUMBS[thumb] : undefined;
};

const video = (channelId: string, videoId: string, rendition: string, title: string, channelTitle: string, publishedAt: string) => ({
  channelId,
  videoId,
  title,
  thumbnail: `https://i.ytimg.com/vi/${videoId}/${rendition}.jpg`,
  channelTitle,
  publishedAt,
});

test("the latest video of each channel, in the channels' order, with the largest thumbnail that exists", async (t) => {
  withEnv(t, { YOUTUBE_KEY: KEY });
  const sent = upstream(t, youTube());
  const fake = fakeDb();

  await youtube(fake.db);

  assert.deepEqual(urls(sent).slice(0, 9), CHANNELS.map(search));
  assert.deepEqual(urls(sent, true).slice(9).sort(), [
    ...["vRt7Qx2LmPk", "Kz8sN4qWd1E", "Hf3ePq9ZyXo", "Lt4gQm2BvNs", "Cy5hWr7TkJa", "Ky6jXs8UlBb", "Dz7kYt9VmCc", "Fw8lZu0WnDd"].map((id) => `HEAD https://i.ytimg.com/vi/${id}/maxresdefault.jpg`),
    ...["Hf3ePq9ZyXo", "Cy5hWr7TkJa", "Ky6jXs8UlBb"].map((id) => `HEAD https://i.ytimg.com/vi/${id}/sddefault.jpg`),
  ].sort());
  // Titles are stored as the API sends them, entities and all: the page decodes every stored string (src/lib/dashboard.ts).
  // The third channel has no video and is left out.
  assert.deepEqual(fake.calls, [
    replaced("youtubeRecs", {
      items: [
        video("UCHnyfMqiRRG1u-2MsSQLbXA", "vRt7Qx2LmPk", "maxresdefault", "The Surprising Physics of Spinning Tops", "Veritasium", "2026-10-09T15:00:12Z"),
        video("UCsXVk37bltHxD1rDPwtNM8Q", "Kz8sN4qWd1E", "maxresdefault", "What If You Fell Into a Neutron Star?", "Kurzgesagt – In a Nutshell", "2026-10-07T14:00:01Z"),
        video("UCMb0O2CdPBNi-QqPk5T3gsQ", "Hf3ePq9ZyXo", "sddefault", "I Tested Every Hand Grinder Under &#39;$100&#39;", "James Hoffmann", "2026-10-10T17:30:00Z"),
        video("UCXuqSBlHAE6Xw-yeJA0Tunw", "Lt4gQm2BvNs", "maxresdefault", "We Built a PC Inside a Fish Tank &amp; It Worked", "Linus Tech Tips", "2026-10-10T19:00:44Z"),
        video("UCcyq283he07B7_KUX07mmtA", "Cy5hWr7TkJa", "hqdefault", "Ten Years of Building Synthesizers", "Sample Channel F", "2026-10-05T09:12:30Z"),
        video("UCKy1dAqELo0zrOtPkf0eTMw", "Ky6jXs8UlBb", "sddefault", "A Field Guide to Urban Birds", "Sample Channel G", "2026-10-08T22:00:05Z"),
        video("UC1D3yD4wlPMico0dss264XA", "Dz7kYt9VmCc", "maxresdefault", "Restoring a 1970s Calculator", "Sample Channel H", "2026-10-03T16:45:00Z"),
        video("UCftwRNsjfRo08xYE31tkiyw", "Fw8lZu0WnDd", "maxresdefault", "How Typefaces Are Drawn", "Sample Channel I", "2026-10-06T11:20:18Z"),
      ],
    }),
  ]);
});

test("no channel with a video writes nothing", async (t) => {
  withEnv(t, { YOUTUBE_KEY: KEY });
  const empty = SEARCH["UCo4K5kzinPI9AHRDp_V4T0w"];
  const sent = upstream(t, youTube(Object.fromEntries(CHANNELS.map((id) => [id, () => json(empty)]))));
  const fake = fakeDb();

  await assert.rejects(youtube(fake.db), /^Error: no YouTube results$/);
  assert.deepEqual(fake.calls, []);
  assert.equal(sent.length, CHANNELS.length, "no thumbnail is looked for");
});

test("one search the API refuses (the daily quota) fails the run; the error carries no key", async (t) => {
  withEnv(t, { YOUTUBE_KEY: KEY });
  const quota = {
    error: {
      code: 403,
      message: 'The request cannot be completed because you have exceeded your <a href="/youtube/v3/getting-started#quota">quota</a>.',
      errors: [{ message: 'The request cannot be completed because you have exceeded your <a href="/youtube/v3/getting-started#quota">quota</a>.', domain: "youtube.quota", reason: "quotaExceeded" }],
    },
  };
  upstream(t, youTube({ "UCXuqSBlHAE6Xw-yeJA0Tunw": () => json(quota, 403) }));
  const fake = fakeDb();

  await assert.rejects(youtube(fake.db), { message: "403 Forbidden from www.googleapis.com" });
  assert.deepEqual(fake.calls, []);
});

test("without YOUTUBE_KEY nothing is asked for", async (t) => {
  withEnv(t, { YOUTUBE_KEY: undefined });
  const sent = upstream(t, {});
  await assert.rejects(youtube(fakeDb().db), /^Error: YOUTUBE_KEY is not set$/);
  assert.deepEqual(sent, []);
});
