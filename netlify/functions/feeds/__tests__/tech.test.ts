// netlify/functions/feeds/__tests__/tech.test.ts — the tech feed against saved Hacker News API responses (topstories, item/<id>).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tech } from "../sources.ts";
import { fakeDb, fixture, fixtureJson, json, respond, upstream, urls, type Answer } from "./harness.ts";

const HN = "https://hacker-news.firebaseio.com/v0";
const ITEMS = fixtureJson("hn-items.json");

/** topstories from its fixture (or `top`), each item from hn-items.json; `override` answers for chosen ids instead. */
const hackerNews = (override: Record<number, Answer> = {}, top?: unknown) => (url: string): Answer | undefined => {
  if (url === `${HN}/topstories.json`) return top === undefined ? "hn-topstories.json" : () => json(top);
  const id = Number(url.match(/^https:\/\/hacker-news\.firebaseio\.com\/v0\/item\/(\d+)\.json$/)?.[1]);
  if (override[id] !== undefined) return override[id];
  // Every item here answers 200: an id that does not exist is the literal `null`, a deleted story `{deleted: true, …}` with no title.
  return id in ITEMS ? () => json(ITEMS[id]) : undefined;
};

test("the top 10 in rank order: id, title, url, score — a text post gets url null, a deleted story is left out", async (t) => {
  const sent = upstream(t, hackerNews());
  const fake = fakeDb();

  await tech(fake.db);

  const top10 = (JSON.parse(fixture("hn-topstories.json")) as number[]).slice(0, 10);
  assert.deepEqual(urls(sent), [`${HN}/topstories.json`, ...top10.map((id) => `${HN}/item/${id}.json`)], "the 11th and 12th are never asked for");
  assert.deepEqual(fake.ops(), ["tech.insertMany", "tech.deleteMany"]);
  assert.deepEqual(fake.list("tech"), [
    { id: 47561201, title: "SQLite's new WAL2 mode is now the default", url: "https://sqlite.org/wal2.html", score: 612 },
    { id: 47559876, title: "A history of the TLS 1.3 downgrade sentinel", url: "https://example-security-blog.dev/posts/downgrade-sentinel?ref=hn", score: 341 },
    { id: 47562044, title: "Ask HN: How do you hand over an open-source project?", url: null, score: 298 },
    { id: 47555310, title: "Acme Robotics (YC W26) is hiring a firmware engineer", url: "https://www.ycombinator.com/companies/acme-robotics/jobs/firmware", score: 1 },
    { id: 47557423, title: "Show HN: A 4 KB ray tracer that runs in a QR code", url: "https://github.com/example/qr-raytracer", score: 177 },
    { id: 47561555, title: "The physics of the perfect espresso puck", url: "https://arxiv.org/abs/2610.01234", score: 154 },
    { id: 47549902, title: "Rust 1.99 released", url: "https://blog.rust-lang.org/2026/10/09/Rust-1.99.0/", score: 149 },
    { id: 47558731, title: "Why your p99 is lying to you (2019)", url: "https://danluu.example/p99/", score: 120 },
    { id: 47562310, title: "The last working UNIVAC, restored", url: "https://computerhistory.example/univac", score: 58 },
  ]);
  // The old list goes only after the new one is in: everything but what was just inserted.
  assert.deepEqual(fake.calls[1].args, [{ _id: { $nin: ["tech-1", "tech-2", "tech-3", "tech-4", "tech-5", "tech-6", "tech-7", "tech-8", "tech-9"] } }]);
});

test("an id that does not exist (null) and a dead story are left out as well", async (t) => {
  upstream(t, hackerNews({ 47559876: () => json(null), 47562044: () => json({ ...ITEMS[47562044], dead: true }) }));
  const fake = fakeDb();

  await tech(fake.db);

  assert.deepEqual(
    fake.list("tech")?.map((s) => s.id),
    [47561201, 47555310, 47557423, 47561555, 47549902, 47558731, 47562310],
  );
});

test("one story that cannot be read fails the run, and the previous list stays", async (t) => {
  upstream(t, hackerNews({ 47557423: () => respond("Service Unavailable", 503) }));
  const fake = fakeDb();
  await assert.rejects(tech(fake.db), /^Error: 503 Service Unavailable from hacker-news\.firebaseio\.com$/);
  assert.deepEqual(fake.calls, []);
});

test("an empty top list writes nothing", async (t) => {
  upstream(t, hackerNews({}, []));
  const fake = fakeDb();
  await assert.rejects(tech(fake.db), /^Error: nothing to write to tech; keeping the previous items$/);
  assert.deepEqual(fake.calls, []);
});
