// The Travel dialog's lit map (spotlight() in src/utils/travelMap.ts): one frame with the overview, what lights for
// each trip, and the label rules it leans on. Invented journeys between real places.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeKey, trips } from '../travel.ts';
import { APAC_MIN, LABEL_TRANSFORM, NARROWEST, mapModel, placeLabels, spotlight, type Anchor, type Spotlight } from '../travelMap.ts';
import type { Journey, Mode, Place } from '../../types/travel.ts';

const p = (city: string, country: string, lat: number, lon: number): Place => ({ city, country, lat, lon });
const SYD = p('Sydney', 'AU', -33.8688, 151.2093);
const OSAKA = p('Osaka', 'JP', 34.6937, 135.5023);
const KYOTO = p('Kyoto', 'JP', 35.0116, 135.7681);
const TOKYO = p('Tokyo', 'JP', 35.6762, 139.6503);
const HANOI = p('Hanoi', 'VN', 21.0285, 105.8542);
const CAT_BA = p('Cat Ba', 'VN', 20.7271, 107.0485);
const SINGAPORE = p('Singapore', 'SG', 1.2903, 103.852);
const JOHOR = p('Johor Bahru', 'MY', 1.4927, 103.7414);
const KL = p('Kuala Lumpur', 'MY', 3.139, 101.6869);
const PENANG = p('Penang', 'MY', 5.4141, 100.3288);
const BANGKOK = p('Bangkok', 'TH', 13.7563, 100.5018);
const SEOUL = p('Seoul', 'KR', 37.5665, 126.978);
const AUCKLAND = p('Auckland', 'NZ', -36.8485, 174.7633);
const LONDON = p('London', 'GB', 51.5072, -0.1276);
const PARIS = p('Paris', 'FR', 48.8566, 2.3522);
const j = (from: Place, to: Place, year: number, month?: number, by: Mode = 'air'): Journey => ({ from, to, year, ...(month ? { month } : {}), by });
const round = (stops: Place[], year: number, month?: number, from = SYD): Journey[] => {
  const all = [from, ...stops, from];
  return all.slice(1).map((to, k) => j(all[k], to, year, month, k > 0 && k < all.length - 2 ? 'land' : 'air'));
};

// Moved to Singapore from Hanoi, a weekend in Johor Bahru, home to Hanoi, Cat Ba by road, back to Sydney, then
// two trips out of Sydney: Malaysia, and Japan last.
const LIFE = [
  j(HANOI, SINGAPORE, 2017, 8),
  ...round([JOHOR], 2018, 7, SINGAPORE),
  j(SINGAPORE, HANOI, 2018, 8),
  ...round([CAT_BA], 2019, 6, HANOI),
  j(HANOI, SYD, 2019, 8),
  j(SYD, KL, 2024, 4),
  j(KL, PENANG, 2024, 4, 'land'),
  j(PENANG, SINGAPORE, 2024, 4),
  j(SINGAPORE, SYD, 2024, 4),
  ...round([OSAKA, KYOTO, TOKYO], 2026, 10),
];
const LAYERS: Array<[number, number]> = [[NARROWEST, 295], [296, 559], [560, 768]];
const OPTS = { aspect: [1.2, 2.2] as [number, number], drawnAt: 640, layers: LAYERS };
const lightOf = (s: Spotlight, i: number) => ({
  routes: s.routeSets.filter((g) => g.trips.includes(i)),
  lands: s.landSets.filter((g) => g.trips.includes(i)),
  labels: s.labelSets.filter((g) => g.trips.includes(i)),
});
/** The layer of `layers` drawn at map width `w`. */
const at = <L extends { minW: number; maxW: number }>(layers: L[], w: number) => layers.find((l) => l.minW <= w && w <= l.maxW)!;

test('the lit map is drawn on the overview frame, cell for cell', () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  assert.deepEqual(s.overview.cells, mapModel(LIFE, ts, OPTS).cells);
  assert.equal(s.overview.w, s.overview.cells.w);
});

test('each trip lights one set of routes and one set of marks and labels; routes it shares with another trip are written once', () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  const ids = new Set(s.routes.map((r) => r.id));
  ts.forEach((t, i) => {
    const lit = lightOf(s, i);
    assert.equal(lit.routes.length, 1, `trip ${i} routes`);
    assert.equal(lit.labels.length, 1, `trip ${i} labels`);
    assert.ok(lit.lands.length <= 1, `trip ${i} lands`);
    for (const leg of lit.routes[0].legs) assert.ok(ids.has(leg.id), leg.id);
    // A pair travelled both ways is one route.
    assert.ok(lit.routes[0].legs.length <= t.legs.length);
  });
  // Every pair of places once, however often it was travelled.
  const pairs = new Set(LIFE.map((x) => [placeKey(x.from), placeKey(x.to)].sort().join('>')));
  assert.equal(s.routes.length, pairs.size);
});

test("a trip's labels name only its own places, and at every width name at least one of them that is not home", () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  ts.forEach((t, i) => {
    const own = new Set(t.stops.map((x) => x.city.toUpperCase()));
    const set = lightOf(s, i).labels[0];
    for (const w of [NARROWEST, 295, 296, 559, 560, 768]) {
      const layer = at(set.layers, w);
      assert.ok(layer, `trip ${i} has a layer at ${w}px`);
      for (const l of layer.labels) for (const name of l.text.split(/ · | \+\d+/).filter(Boolean)) assert.ok(own.has(name), `trip ${i} at ${w}px names ${name}`);
      assert.ok(
        layer.labels.some((l) => l.kind !== 'home'),
        `trip ${i} at ${w}px: ${layer.labels.map((l) => l.text).join(', ') || 'no labels'}`,
      );
    }
  });
});

test("a trip's marks sit exactly on the unlabelled marks under them", () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  for (const set of s.labelSets) {
    for (const layer of set.layers) {
      for (const w of [layer.minW, layer.maxW]) {
        const base = at(s.base, w);
        for (const m of layer.marks) assert.ok(base.marks.some((b) => b.key === m.key && b.left === m.left && b.top === m.top), `${m.key} at ${w}px`);
      }
    }
  }
});

test('a trip from a place lived in marks where it set off, and lights only the countries it reached', () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  // Hanoi → Singapore: Singapore lit, not Vietnam; Hanoi is where it set off from.
  const first = lightOf(s, 0);
  assert.deepEqual(first.lands[0].countries, ['c-SG']);
  assert.ok(first.labels[0].layers.every((l) => l.marks.some((m) => m.kind === 'from' && m.key.split('+').includes(placeKey(HANOI)))));
  // A weekend in Johor Bahru from Singapore lights Malaysia only; Cat Ba from Hanoi lights Vietnam.
  const johor = ts.findIndex((t) => t.stops.some((x) => x.city === 'Johor Bahru'));
  assert.deepEqual(lightOf(s, johor).lands[0].countries, ['c-MY']);
  const catBa = ts.findIndex((t) => t.stops.some((x) => x.city === 'Cat Ba'));
  assert.deepEqual(lightOf(s, catBa).lands[0].countries, ['c-VN']);
  // Hanoi → Sydney reaches only home: no country lights.
  const home = ts.findIndex((t) => t.stops[0].city === 'Hanoi' && t.stops.at(-1)!.city === 'Sydney');
  assert.equal(lightOf(s, home).lands.length, 0);
  // A shared mark names where the trip went before where it set off: "CAT BA · HANOI".
  assert.ok(lightOf(s, catBa).labels[0].layers.some((l) => l.labels.some((x) => x.text.startsWith('CAT BA'))));
});

test("the overview names the latest trip's first place at every width, the narrowest included", () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  for (const layer of s.overview.layers) assert.ok(layer.labels.some((l) => l.kind === 'now' && /OSAKA/.test(l.text)), `${layer.minW}: ${layer.labels.map((l) => l.text).join(', ')}`);
});

test('labels: ghost marks block a label but are no rivals for it; a label that must show gives up the nearness rule last', () => {
  const frame = { w: 100, h: 60 };
  // A lit mark with faint marks 12px above and below it: a label beside it is nearer one of them than the rule allows.
  const marks = [{ x: 50, y: 30, size: 9 }, { x: 50, y: 25, size: 7 }, { x: 50, y: 35, size: 7 }];
  const wants = [{ mark: 0, texts: ['KYOTO'] }];
  assert.deepEqual(placeLabels(marks, wants, frame, 240, 240), []);
  assert.equal(placeLabels(marks, wants, frame, 240, 240, { rivals: (i) => i === 0 }).length, 1);
  const must = placeLabels(marks, [{ mark: 0, texts: ['KYOTO · OSAKA', 'KYOTO +1'], must: true }], frame, 240, 240);
  assert.deepEqual(must.map((l) => l.text), ['KYOTO +1']);
});

test('one trip, a trip to Europe, and years with no month all build', () => {
  const one = round([TOKYO], 2025, 4);
  assert.equal(spotlight(one, trips(one), OPTS).labelSets.length, 1);
  const europe = [...round([HANOI], 2023, 2), ...round([LONDON, PARIS], 2024, 6), ...round([TOKYO], 2025, 10)];
  const se = spotlight(europe, trips(europe), OPTS);
  assert.ok(se.overview.cells.w > (APAC_MIN.east - APAC_MIN.west) * 1.5, 'the frame widens to Europe');
  const nomonth = [...round([SINGAPORE, KL], 2016), ...round([BANGKOK], 2018, 3), ...round([SEOUL], 2021)];
  const sn = spotlight(nomonth, trips(nomonth), OPTS);
  assert.equal(sn.routeSets.flatMap((g) => g.trips).length, 3);
});

test('64 trips stay inside the budget the home page can carry', () => {
  const pool = [TOKYO, HANOI, SINGAPORE, BANGKOK, SEOUL, AUCKLAND, KL, PENANG, OSAKA];
  const many: Journey[] = [];
  for (let n = 0; n < 64; n++) {
    const a = pool[n % pool.length];
    const b = pool[(n * 7 + 3) % pool.length];
    many.push(...round(a === b || n % 3 ? [a] : [a, b], 1995 + Math.floor(n / 2), n % 5 === 4 ? undefined : ((n * 5) % 12) + 1));
  }
  const ts = trips(many);
  assert.equal(ts.length, 64);
  const s = spotlight(many, ts, OPTS);
  // What the dialog writes per trip is its label sets: measured at about 0.6 KB a trip.
  const bytes = JSON.stringify({ labelSets: s.labelSets, routeSets: s.routeSets, landSets: s.landSets }).length;
  assert.ok(bytes < 64 * 1024, `${bytes} bytes for 64 trips`);
  assert.ok(s.labelSets.length < 64, 'trips that light the same are written once');
});

test("the label anchors in the CSS are the placer's", () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  for (const [a, t] of Object.entries(LABEL_TRANSFORM) as Array<[Anchor, string]>) assert.ok(css.includes(`.tmap-a-${a} { transform: ${t}; }`), `.tmap-a-${a}`);
});
