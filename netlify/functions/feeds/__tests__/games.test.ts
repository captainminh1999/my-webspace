// netlify/functions/feeds/__tests__/games.test.ts — the games feed against a saved RAWG /api/games response.
import { test } from "node:test";
import assert from "node:assert/strict";
import { games } from "../sources.ts";
import { answer, fakeDb, frozenAt, json, upstream, urls, withEnv, type Answer } from "./harness.ts";

const KEY = "test-rawg-key";
// The feed's own schedule, 04:00 UTC; the window is the 30 days before, as UTC dates.
const RAWG = `https://api.rawg.io/api/games?key=${KEY}&dates=2026-09-11,2026-10-11&ordering=-rating&page_size=10`;

test("the best-rated games released in the last 30 days: id, name, picture, release date", async (t) => {
  withEnv(t, { RAWG_KEY: KEY });
  frozenAt(t, "2026-10-11T04:00:00Z");
  const sent = upstream(t, { [RAWG]: "rawg-games.json" });
  const fake = fakeDb();

  await games(fake.db);

  assert.deepEqual(urls(sent), [RAWG]);
  assert.deepEqual(fake.ops(), ["games.insertMany", "games.deleteMany"]);
  assert.deepEqual(fake.list("games"), [
    { id: 1011201, name: "Hollow Lantern", thumbnail: "https://media.rawg.io/media/games/3f1/3f1a7c0a1c0f5e2b9d8e7c6b5a4f3e2d.jpg", released: "2026-09-18" },
    { id: 1009876, name: "Star Freight Tycoon", thumbnail: "https://media.rawg.io/media/games/9b2/9b2c4e6f8a0b1c2d3e4f5a6b7c8d9e0f.jpg", released: "2026-10-02" },
    // RAWG has no picture for some new releases: stored as it comes, for the card to handle.
    { id: 1012345, name: "Tidepool", thumbnail: null, released: "2026-10-09" },
  ]);
});

test("a payload without a results list, an HTTP error or an empty list writes nothing", async (t) => {
  withEnv(t, { RAWG_KEY: KEY });
  frozenAt(t, "2026-10-11T04:00:00Z");
  let rawg: Answer = 200;
  upstream(t, { [RAWG]: () => answer(rawg) });

  const cases: [Answer, RegExp][] = [
    [() => json({ error: "The key parameter is not provided" }), /^Error: unexpected RAWG payload$/],
    [() => json({ detail: "Invalid page." }), /^Error: unexpected RAWG payload$/],
    [() => json({ error: "The key parameter is not provided" }, 401), /^Error: 401 Unauthorized from api\.rawg\.io$/],
    [() => json({ count: 0, next: null, previous: null, results: [] }), /^Error: nothing to write to games; keeping the previous items$/],
  ];
  for (const [response, error] of cases) {
    rawg = response;
    const fake = fakeDb();
    await assert.rejects(games(fake.db), error);
    assert.deepEqual(fake.calls, []);
  }
});

test("without RAWG_KEY nothing is asked for", async (t) => {
  withEnv(t, { RAWG_KEY: undefined });
  const sent = upstream(t, {});
  await assert.rejects(games(fakeDb().db), /^Error: RAWG_KEY is not set$/);
  assert.deepEqual(sent, []);
});
