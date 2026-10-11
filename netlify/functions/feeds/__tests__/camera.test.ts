// netlify/functions/feeds/__tests__/camera.test.ts — the camera feed against a saved Unsplash /photos/random response.
import { test } from "node:test";
import assert from "node:assert/strict";
import { camera } from "../sources.ts";
import { answer, fakeDb, fixtureJson, json, replaced, respond, upstream, urls, withEnv, type Answer } from "./harness.ts";

const KEY = "test-unsplash-key";
const RANDOM = `https://api.unsplash.com/photos/random?orientation=landscape&client_id=${KEY}`;

const PHOTO = {
  id: "q8XwPz4kLmA",
  thumbnail: "https://images.unsplash.com/photo-1790000000000-0a1b2c3d4e5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0MjY2NDN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTE2OTQ4MDB8&ixlib=rb-4.1.0&q=80&w=400",
  full: "https://images.unsplash.com/photo-1790000000000-0a1b2c3d4e5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w0MjY2NDN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTE2OTQ4MDB8&ixlib=rb-4.1.0&q=85",
  width: 6000,
  height: 4000,
  photographer: "Sample Photographer",
  profile: "https://unsplash.com/@coastlines_sample",
  alt: "a lighthouse on a rocky coast at dusk",
  createdAt: "2026-09-28T07:41:12Z",
};

test("one landscape photo: the small and full renditions, its size, the photographer and the alt text", async (t) => {
  withEnv(t, { UNSPLASH_KEY: KEY });
  const sent = upstream(t, { [RANDOM]: "unsplash-random.json" });
  const fake = fakeDb();

  await camera(fake.db);

  assert.deepEqual(urls(sent), [RANDOM]);
  assert.deepEqual(fake.calls, [replaced("photography", PHOTO)]);
});

test("a photo without alt text is stored with an empty one", async (t) => {
  withEnv(t, { UNSPLASH_KEY: KEY });
  upstream(t, { [RANDOM]: () => json({ ...fixtureJson("unsplash-random.json"), alt_description: null }) });
  const fake = fakeDb();

  await camera(fake.db);

  assert.deepEqual(fake.calls, [replaced("photography", { ...PHOTO, alt: "" })]);
});

test("an answer without a photo id, a refused key or the hourly limit writes nothing", async (t) => {
  withEnv(t, { UNSPLASH_KEY: KEY });
  let unsplash: Answer = 200;
  upstream(t, { [RANDOM]: () => answer(unsplash) });

  const cases: [Answer, RegExp][] = [
    [() => json({ errors: ["No photos found."] }), /^Error: unexpected Unsplash payload$/],
    [() => json({ errors: ["OAuth error: The access token is invalid"] }, 401), /^Error: 401 Unauthorized from api\.unsplash\.com$/],
    [() => respond("Rate Limit Exceeded", 403, "text/plain"), /^Error: 403 Forbidden from api\.unsplash\.com$/],
  ];
  for (const [response, error] of cases) {
    unsplash = response;
    const fake = fakeDb();
    await assert.rejects(camera(fake.db), error);
    assert.deepEqual(fake.calls, []);
  }
});

test("without UNSPLASH_KEY nothing is asked for", async (t) => {
  withEnv(t, { UNSPLASH_KEY: undefined });
  const sent = upstream(t, {});
  await assert.rejects(camera(fakeDb().db), /^Error: UNSPLASH_KEY is not set$/);
  assert.deepEqual(sent, []);
});
