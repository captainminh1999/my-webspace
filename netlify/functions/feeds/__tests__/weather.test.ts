// netlify/functions/feeds/__tests__/weather.test.ts — the weather feed against a saved One Call 3.0 response (Sydney, metric).
import { test } from "node:test";
import assert from "node:assert/strict";
import { weather } from "../sources.ts";
import { fakeDb, fixtureJson, frozenAt, json, replaced, upstream, urls, withEnv } from "./harness.ts";

const KEY = "test-weather-key";
const ONECALL = `https://api.openweathermap.org/data/3.0/onecall?lat=-33.87&lon=151.21&units=metric&exclude=minutely,alerts&appid=${KEY}`;

test("stores now, the next 12 hours and the next 7 days: temperature and icon only", async (t) => {
  withEnv(t, { WEATHER_KEY: KEY });
  frozenAt(t, "2026-10-11T00:10:27Z");
  const sent = upstream(t, { [ONECALL]: "openweather-onecall.json" });
  const fake = fakeDb();

  await weather(fake.db);

  assert.deepEqual(urls(sent), [ONECALL]);
  assert.deepEqual(fake.calls, [
    replaced("weather", {
      updated: 1791677427, // the run's own clock, in seconds — not the upstream's current.dt
      current: { temp: 19.87, icon: "02d" },
      hourly: [
        { dt: 1791676800, temp: 19.62, icon: "02d" },
        { dt: 1791680400, temp: 20.41, icon: "02d" },
        { dt: 1791684000, temp: 21.18, icon: "03d" },
        { dt: 1791687600, temp: 21.93, icon: "03d" },
        { dt: 1791691200, temp: 22.27, icon: "04d" },
        { dt: 1791694800, temp: 22.04, icon: "04d" },
        { dt: 1791698400, temp: 21.36, icon: "10d" },
        { dt: 1791702000, temp: 20.12, icon: "10d" },
        { dt: 1791705600, temp: 18.85, icon: "04d" },
        { dt: 1791709200, temp: 17.9, icon: "04n" },
        { dt: 1791712800, temp: 17.31, icon: "04n" },
        { dt: 1791716400, temp: 16.88, icon: "02n" },
      ],
      daily: [
        { dt: 1791680400, min: 15.9, max: 22.3, icon: "10d" },
        { dt: 1791766800, min: 14.2, max: 24.8, icon: "01d" },
        { dt: 1791853200, min: 16.1, max: 27.5, icon: "02d" },
        { dt: 1791939600, min: 17.4, max: 21.2, icon: "09d" },
        { dt: 1792026000, min: 13.8, max: 19.6, icon: "04d" },
        { dt: 1792112400, min: 12.9, max: 20.4, icon: "03d" },
        { dt: 1792198800, min: 13.5, max: 23.1, icon: "01d" },
      ],
    }),
  ]);
});

test("a payload without current, hourly or daily is refused and nothing is written", async (t) => {
  withEnv(t, { WEATHER_KEY: KEY });
  const full = fixtureJson("openweather-onecall.json");
  const payloads = [
    // What One Call answers in the body of a bad request.
    { cod: "400", message: "wrong latitude", parameters: ["lat"] },
    { ...full, hourly: undefined },
    { ...full, daily: { "0": full.daily[0] } },
    { ...full, current: null },
    null,
  ];
  let payload: unknown;
  upstream(t, { [ONECALL]: () => json(payload) });
  for (payload of payloads) {
    const fake = fakeDb();
    await assert.rejects(weather(fake.db), /^Error: unexpected OpenWeather payload$/, JSON.stringify(payload)?.slice(0, 60));
    assert.deepEqual(fake.calls, []);
  }
});

test("an HTTP error names the status and the host, never the URL with its key", async (t) => {
  withEnv(t, { WEATHER_KEY: KEY });
  upstream(t, { [ONECALL]: () => json({ cod: 401, message: "Invalid API key. Please see https://openweathermap.org/faq#error401 for more info." }, 401) });
  const fake = fakeDb();
  const err: Error = await weather(fake.db).then(() => assert.fail("resolved"), (e: Error) => e);
  assert.equal(err.message, "401 Unauthorized from api.openweathermap.org");
  assert.deepEqual(fake.calls, []);
});

test("without WEATHER_KEY nothing is asked for", async (t) => {
  withEnv(t, { WEATHER_KEY: undefined });
  const sent = upstream(t, {});
  await assert.rejects(weather(fakeDb().db), /^Error: WEATHER_KEY is not set$/);
  assert.deepEqual(sent, []);
});
