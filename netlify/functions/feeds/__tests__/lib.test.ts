// netlify/functions/feeds/__tests__/lib.test.ts — the shared plumbing every feed goes through: what an upstream error says,
// how a picture is measured, and exactly what is asked of the driver for each write.
// runFeed is tested only with the switch off: switched on, it connects to MongoDB, which no test here does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { READER, getJson, getText, imageSize, requireEnv, runFeed, stamp, writeCollection, writeSingleton } from "../lib.ts";
import { fakeDb, frozenAt, json, quiet, respond, upstream, urls, withEnv } from "./harness.ts";

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...u32(13), 0x49, 0x48, 0x44, 0x52, ...u32(2048), ...u32(1365), 8, 6, 0, 0, 0]);

/** A body delivered in the given chunks, counting how many were pulled and whether the reader gave up on it. */
function chunked(chunks: Iterable<Uint8Array<ArrayBuffer>>) {
  const it = chunks[Symbol.iterator]();
  const seen = { pulled: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
    pull(controller) {
      const next = it.next();
      if (next.done) return controller.close();
      seen.pulled++;
      controller.enqueue(next.value);
    },
    cancel() {
      seen.cancelled = true;
    },
  });
  return { body, seen };
}

test("an upstream error names the status and the host only: query strings carry API keys", async (t) => {
  upstream(t, () => () => json({ message: "Invalid API key" }, 401));
  await assert.rejects(getJson("https://api.example.org/v1/thing?key=SECRET&q=1"), { message: "401 Unauthorized from api.example.org" });
  await assert.rejects(getText("https://www.example.com/feed/?token=SECRET"), { message: "401 Unauthorized from www.example.com" });
});

test("getText introduces the feed by name and keeps a deadline it is given; getJson keeps the caller's headers", async (t) => {
  const signals: (AbortSignal | null | undefined)[] = [];
  const sent = upstream(t, (_url, init) => {
    signals.push(init.signal);
    return () => respond("<rss/>", 200, "application/rss+xml");
  });
  const deadline = AbortSignal.timeout(10_000);

  assert.equal(await getText("https://sprudge.com/feed", deadline), "<rss/>");
  await getJson("https://sprudge.com/wp-json/wp/v2/posts", { headers: READER }).catch(() => {});

  assert.deepEqual(sent.map((s) => s.headers["user-agent"]), [READER["User-Agent"], READER["User-Agent"]]);
  assert.equal(signals[0], deadline, "one deadline shared by a paper's JSON and RSS tries");
});

test("imageSize asks for the first 256 KB and reads only until the header gives the size", async (t) => {
  const { body, seen } = chunked([PNG.slice(0, 10), PNG.slice(10, 20), PNG.slice(20), new Uint8Array(4096), new Uint8Array(4096)]);
  const sent = upstream(t, () => () => new Response(body, { status: 206 }));

  assert.deepEqual(await imageSize("https://example.org/picture.png"), { width: 2048, height: 1365 });
  assert.equal(sent[0].headers.range, "bytes=0-262143");
  assert.ok(seen.pulled <= 4 && seen.cancelled, `pulled ${seen.pulled} chunks`);
});

test("imageSize gives up after 256 KB of a server that ignores Range and sends something that is not a picture", async (t) => {
  // 64 KB chunks, far more than the limit.
  const { body, seen } = chunked(Array.from({ length: 100 }, () => new Uint8Array(65_536).fill(0x20)));
  upstream(t, () => () => new Response(body, { status: 200 }));

  assert.equal(await imageSize("https://example.org/not-a-picture"), null);
  assert.ok(seen.pulled <= 5 && seen.cancelled, `pulled ${seen.pulled} chunks`);
});

test("imageSize never throws: a missing picture, a failed request or a page is no size", async (t) => {
  upstream(t, (url) => {
    if (url.endsWith("/gone.jpg")) return 404;
    if (url.endsWith("/page.jpg")) return () => respond("<!doctype html><title>Not found</title>", 200);
    if (url.endsWith("/empty.jpg")) return () => new Response(null, { status: 200 });
    return undefined; // a network error
  });
  for (const name of ["gone", "page", "empty", "unreachable"]) assert.equal(await imageSize(`https://example.org/${name}.jpg`), null, name);
});

test("writeCollection inserts the new list, then deletes everything else; an empty list is refused before any write", async () => {
  const fake = fakeDb();
  await writeCollection(fake.db, "games", [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(fake.calls, [
    { coll: "games", op: "insertMany", args: [[{ id: 1 }, { id: 2 }]] },
    { coll: "games", op: "deleteMany", args: [{ _id: { $nin: ["games-1", "games-2"] } }] },
  ]);

  const untouched = fakeDb();
  await assert.rejects(writeCollection(untouched.db, "games", []), { message: "nothing to write to games; keeping the previous items" });
  assert.deepEqual(untouched.calls, []);
});

test("writeSingleton replaces singletons/<id> whole, creating it when missing", async () => {
  const fake = fakeDb();
  await writeSingleton(fake.db, "weather", { updated: 1 });
  assert.deepEqual(fake.calls, [{ coll: "singletons", op: "replaceOne", args: [{ _id: "weather" }, { updated: 1 }, { upsert: true }] }]);
});

test("stamp sets meta.fetchedAt.<feed> to now and returns it, for the warm-up to look for on the page", async (t) => {
  frozenAt(t, "2026-10-11T00:10:27.123Z");
  const fake = fakeDb();
  assert.equal(await stamp(fake.db, "weather"), "2026-10-11T00:10:27.123Z");
  assert.deepEqual(fake.calls, [
    { coll: "singletons", op: "updateOne", args: [{ _id: "meta" }, { $set: { "fetchedAt.weather": "2026-10-11T00:10:27.123Z" } }, { upsert: true }] },
  ]);
});

test('requireEnv refuses an unset or empty variable', (t) => {
  withEnv(t, { FEED_TEST_A: undefined, FEED_TEST_B: "", FEED_TEST_C: "value" });
  assert.throws(() => requireEnv("FEED_TEST_A"), { message: "FEED_TEST_A is not set" });
  assert.throws(() => requireEnv("FEED_TEST_B"), { message: "FEED_TEST_B is not set" });
  assert.equal(requireEnv("FEED_TEST_C"), "value");
});

test('runFeed does nothing unless FEEDS_VIA_NETLIFY is exactly "true"', async (t) => {
  const { log } = quiet(t);
  const sent = upstream(t, {});
  let ran = 0;
  for (const value of [undefined, "", "false", "TRUE", "1"]) {
    withEnv(t, { FEEDS_VIA_NETLIFY: value });
    const res = await runFeed("tech", async () => {
      ran++;
    });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "skipped");
  }
  assert.equal(ran, 0);
  assert.deepEqual(urls(sent), []);
  assert.equal(log.mock.callCount(), 5);
});
