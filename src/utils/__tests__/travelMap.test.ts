// The Travel dialog's lit map (spotlight() in src/utils/travelMap.ts): one frame with the overview, what lights for
// each trip, and the label rules it leans on. Invented journeys between real places.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeKey, trips } from '../travel.ts';
import { APAC_MIN, LABEL_TRANSFORM, NARROWEST, at as atCell, cropLand, labelBox, mapModel, placeLabels, spotlight, type Anchor, type Box, type Spotlight } from '../travelMap.ts';
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
const MANILA = p('Manila', 'PH', 14.5995, 120.9842);
const BUSAN = p('Busan', 'KR', 35.1796, 129.0756);
const SHANGHAI = p('Shanghai', 'CN', 31.2304, 121.4737);
const DUBAI = p('Dubai', 'AE', 25.2048, 55.2708);
const NAGOYA = p('Nagoya', 'JP', 35.1815, 136.9066);
const HIROSHIMA = p('Hiroshima', 'JP', 34.3853, 132.4553);
const SAPPORO = p('Sapporo', 'JP', 43.0618, 141.3545);
const HUE = p('Hue', 'VN', 16.4637, 107.5909);
const HCMC = p('Ho Chi Minh City', 'VN', 10.7769, 106.7009);
const DA_LAT = p('Da Lat', 'VN', 11.9404, 108.4583);
const DA_NANG = p('Da Nang', 'VN', 16.0544, 108.2022);
const HOI_AN = p('Hoi An', 'VN', 15.8801, 108.338);
const HONG_KONG = p('Hong Kong', 'HK', 22.3193, 114.1694);
const TAIPEI = p('Taipei', 'TW', 25.033, 121.5654);
const JIUFEN = p('Jiufen', 'TW', 25.1092, 121.8445);
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
// A latest trip to the frame's east edge, beside home: no anchor fits there without covering Sydney's mark.
const TO_THE_EDGE = [...LIFE.slice(0, -4), ...round([OSAKA, KYOTO, TOKYO], 2025, 10), ...round([AUCKLAND], 2026, 12)];
// A trip out of a base (Hanoi to Hue) among many nearby places: its destination is named only by the fallback.
const OUT_OF_A_BASE = [
  j(SYD, HANOI, 2018, 8),
  ...round([HUE], 2019, 3, HANOI),
  j(HANOI, SYD, 2019, 8),
  ...round([HCMC, DA_LAT], 2023, 2),
  ...round([DA_NANG, HOI_AN], 2023, 9),
  ...round([BANGKOK], 2024, 1),
  ...round([HONG_KONG, TAIPEI, JIUFEN], 2024, 6),
  ...round([OSAKA, KYOTO, TOKYO], 2026, 10),
];
// Invented places 4.5° apart: the latest trip's first stop with its second stop to the east and earlier places
// on every other side, so only covering a faint mark makes room for its name.
const at45 = (city: string, dLat: number, dLon: number) => p(city, 'PH', 12 + dLat * 4.5, 124 + dLon * 4.5);
const HEMMED = [
  ...[at45('West', 0, -1), at45('North', 1, 0), at45('South', -1, 0), at45('East', 0, 2), at45('Northeast', 1, 1), at45('Southeast', -1, 1)].flatMap((g, k) => round([g], 2010 + k, 3)),
  ...round([at45('Alpha', 0, 0), at45('Bravo', 0, 1)], 2026, 1),
];
// More invented histories between real places (src/utils/__tests__/fixtures/travel-histories.json): three random
// ones, and four built to reproduce what reviews found (a label over faint marks, a move home from a base, a trip
// beside home among faint marks, a trip out of a base hemmed in at the map's edge).
const HISTORIES: Record<string, Journey[]> = JSON.parse(readFileSync(new URL('./fixtures/travel-histories.json', import.meta.url), 'utf8'));
const LAYERS: Array<[number, number]> = [[NARROWEST, 295], [296, 559], [560, 768]];
const OPTS = { aspect: [1.2, 2.2] as [number, number], drawnAt: 640, layers: LAYERS };
const CARD = { aspect: [1.2, 2] as [number, number], drawnAt: 472, layers: [[NARROWEST, 295], [296, 703]] as Array<[number, number]> };
const lightOf = (s: Spotlight, i: number) => ({
  routes: s.routeSets.filter((g) => g.trips.includes(i)),
  lands: s.landSets.filter((g) => g.trips.includes(i)),
  labels: s.labelSets.filter((g) => g.trips.includes(i)),
});
/** The layer of `layers` drawn at map width `w`. */
const at = <L extends { minW: number; maxW: number }>(layers: L[], w: number) => layers.find((l) => l.minW <= w && w <= l.maxW)!;

test('the lit map is drawn on the overview frame: every mark on an overview mark, every route between its places', () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  const places = (key: string) => key.split('+').sort().join('+');
  for (const layer of s.overview.layers) {
    const base = at(s.base, layer.minW);
    assert.equal(base.marks.length, layer.marks.length, `${layer.minW}px`);
    for (const m of base.marks) assert.ok(layer.marks.some((o) => places(o.key) === places(m.key) && o.left === m.left && o.top === m.top), `${m.key} at ${layer.minW}px`);
  }
  // Each route runs between two places of a journey, as the overview's frame places them.
  const n1 = (v: number) => +v.toFixed(1);
  const point = (x: Place) => {
    const q = atCell(x, s.overview.cells);
    return `${n1(q.x)} ${n1(q.y)}`;
  };
  const journeyEnds = new Set(LIFE.map((x) => [point(x.from), point(x.to)].sort().join('|')));
  for (const r of s.routes) {
    const pts = [...r.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => `${m[1]} ${m[2]}`);
    assert.ok(journeyEnds.has([pts[0], pts[pts.length - 1]].sort().join('|')), `route ${r.id} ends at its places`);
  }
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
    // The routes it lights are its own journeys, each pair of places once.
    const n1 = (v: number) => +v.toFixed(1);
    const point = (x: Place) => {
      const q = atCell(x, s.overview.cells);
      return `${n1(q.x)} ${n1(q.y)}`;
    };
    const ends = (d: string) => {
      const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => `${m[1]} ${m[2]}`);
      return [pts[0], pts[pts.length - 1]].sort().join('|');
    };
    const own = new Set(t.legs.map((x) => [point(x.from), point(x.to)].sort().join('|')));
    const lit_ = new Set(lit.routes[0].legs.map((l) => ends(s.routes.find((r) => r.id === l.id)!.d)));
    assert.deepEqual([...lit_].sort(), [...own].sort(), `trip ${i} lights its own journeys`);
    // A pair travelled both ways in one trip is one route.
    const legs = lit.routes[0].legs.map((l) => `${l.id}|${l.land}`);
    assert.equal(new Set(legs).size, legs.length, `trip ${i}: ${legs.join(', ')}`);
    assert.ok(legs.length <= t.legs.length);
  });
  const johor = ts.findIndex((t) => t.stops.some((x) => x.city === 'Johor Bahru'));
  assert.equal(lightOf(s, johor).routes[0].legs.length, 1, 'Singapore → Johor Bahru → Singapore is one route');
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

test("the overview names one of the latest trip's places at every width, the narrowest included", () => {
  const ts = trips(LIFE);
  const s = spotlight(LIFE, ts, OPTS);
  for (const layer of s.overview.layers) assert.ok(layer.labels.some((l) => l.kind === 'now' && /OSAKA/.test(l.text)), `${layer.minW}: ${layer.labels.map((l) => l.text).join(', ')}`);
});

// A wide frame (Dubai) puts the latest trip's three places, and the places travelled before them, within a few px
// of each other on a 240px map: by the plain rules no label of the latest trip fits.
const CROWDED = [
  ...round([BANGKOK], 2015, 3),
  ...round([MANILA], 2016, 3),
  ...round([BUSAN], 2017, 3),
  ...round([DUBAI], 2018, 3),
  ...round([SHANGHAI], 2019, 3),
  ...round([NAGOYA, HIROSHIMA, SAPPORO], 2026, 10),
];
const ALL: Record<string, Journey[]> = { LIFE, CROWDED, OUT_OF_A_BASE, TO_THE_EDGE, HEMMED, ...HISTORIES };


test('on a crowded 240px map the latest trip is still named, in the overview and when lit', () => {
  const ts = trips(CROWDED);
  const s = spotlight(CROWDED, ts, OPTS);
  const latest = ts.length - 1;
  const own = /NAGOYA|HIROSHIMA|SAPPORO/;
  const overview = at(s.overview.layers, NARROWEST).labels;
  assert.ok(overview.some((l) => l.kind === 'now' && own.test(l.text)), `overview: ${overview.map((l) => l.text).join(', ') || 'no labels'}`);
  const lit = at(lightOf(s, latest).labels[0].layers, NARROWEST).labels;
  assert.ok(lit.some((l) => l.kind === 'now' && own.test(l.text)), `lit: ${lit.map((l) => l.text).join(', ') || 'no labels'}`);
});

test('a trip out of a base names the place it reached at every width, not only where it set off from', () => {
  const ts = trips(OUT_OF_A_BASE);
  const s = spotlight(OUT_OF_A_BASE, ts, OPTS);
  const hue = ts.findIndex((t) => t.stops.some((x) => x.city === 'Hue'));
  for (const w of [NARROWEST, 296, 559, 560, 768]) {
    const labels = at(lightOf(s, hue).labels[0].layers, w).labels;
    assert.ok(labels.some((l) => l.kind === 'now' && /HUE/.test(l.text)), `${w}px: ${labels.map((l) => `${l.text}/${l.kind}`).join(', ')}`);
  }
});

test("a latest trip at the frame's edge beside home is named at every width, on the card too, over home's mark if it must", () => {
  const ts = trips(TO_THE_EDGE);
  const s = spotlight(TO_THE_EDGE, ts, OPTS);
  const card = mapModel(TO_THE_EDGE, ts, CARD);
  const named = (labels: Array<{ text: string; kind: string }>) => labels.some((l) => l.kind === 'now' && l.text === 'AUCKLAND');
  for (const layer of [...card.layers, ...s.overview.layers]) assert.ok(named(layer.labels), `${layer.minW}px: ${layer.labels.map((l) => l.text).join(', ')}`);
  for (const layer of lightOf(s, ts.length - 1).labels[0].layers) assert.ok(named(layer.labels), `lit ${layer.minW}px: ${layer.labels.map((l) => l.text).join(', ')}`);
});

test('faint marks are no rivals: a lit trip names its places beside them', () => {
  const ts = trips(OUT_OF_A_BASE);
  const s = spotlight(OUT_OF_A_BASE, ts, OPTS);
  const texts = (city: string) => at(lightOf(s, ts.findIndex((t) => t.stops.some((x) => x.city === city))).labels[0].layers, NARROWEST).labels.map((l) => l.text);
  assert.deepEqual(texts('Hong Kong').filter((t) => t !== 'SYDNEY').sort(), ['HONG KONG', 'TAIPEI · JIUFEN']);
  assert.ok(texts('Da Nang').includes('DA NANG · HOI AN'), texts('Da Nang').join(', '));
});

test("a place hemmed in on every side is named over a faint mark, never over the trip's next stop", () => {
  const ts = trips(HEMMED);
  const s = spotlight(HEMMED, ts, OPTS);
  const card = mapModel(HEMMED, ts, CARD);
  for (const layer of [card.layers[0], s.overview.layers[0], lightOf(s, ts.length - 1).labels[0].layers[0]]) {
    assert.ok(layer.labels.some((l) => l.text === 'ALPHA'), layer.labels.map((l) => l.text).join(', '));
  }
});

test('every lit trip, in every history, names a place it reached at every width (or, if it reached only home, where it set off from)', () => {
  for (const [name, js] of Object.entries(ALL)) {
    const ts = trips(js);
    const s = spotlight(js, ts, OPTS);
    for (const set of s.labelSets) {
      for (const layer of set.layers) {
        const want = layer.marks.some((m) => m.kind === 'now') ? 'now' : layer.marks.some((m) => m.kind === 'from') ? 'from' : null;
        if (want) assert.ok(layer.labels.some((l) => l.kind === want), `${name} trip ${set.trips.join(' ')} at ${layer.minW}px: ${layer.labels.map((l) => `${l.text}/${l.kind}`).join(', ')}`);
      }
    }
  }
});

test('a forced label covers home only when covering a faint mark will not do', () => {
  const js = HISTORIES.aucklandAmongFaint;
  const ts = trips(js);
  const s = spotlight(js, ts, OPTS);
  const akl = ts.findIndex((t) => t.stops.some((x) => x.city === 'Auckland'));
  const narrow = at(lightOf(s, akl).labels[0].layers, NARROWEST).labels.map((l) => l.text);
  assert.ok(narrow.includes('AUCKLAND') && narrow.includes('SYDNEY'), narrow.join(', '));
});

test('the card and the overview, too, cover home only when covering a faint mark will not do', () => {
  // The same history with the trip to Auckland made the latest.
  const akl = (x: Journey) => x.from.city === 'Auckland' || x.to.city === 'Auckland';
  const js = [...HISTORIES.aucklandAmongFaint.filter((x) => !akl(x)), ...HISTORIES.aucklandAmongFaint.filter(akl).map((x) => ({ ...x, year: 2030 }))];
  const ts = trips(js);
  assert.ok(ts[ts.length - 1].stops.some((x) => x.city === 'Auckland'));
  const s = spotlight(js, ts, OPTS);
  const card = mapModel(js, ts, CARD);
  for (const [layer, frame] of [[card.layers[0], card], [s.overview.layers[0], s.overview]] as const) {
    const l = layer.labels.find((x) => x.text === 'AUCKLAND');
    assert.ok(l, layer.labels.map((x) => x.text).join(', '));
    const home = layer.marks.find((m) => m.kind === 'home')!;
    for (let W = layer.minW; W <= layer.maxW; W += 5) {
      const b = labelBox(l.left * frame.w, l.top * frame.h, l.anchor, l.text, W, frame.w);
      const x = home.left * W;
      const y = home.top * frame.h * (W / frame.w);
      assert.ok(b.r <= x - 5.5 || b.l >= x + 5.5 || b.b <= y - 5.5 || b.t >= y + 5.5, `${W}px: AUCKLAND (${l.anchor}) over home`);
    }
  }
});

test("the latest trip's countries leave out home's", () => {
  const js = [...LIFE.slice(0, -4), ...round([OSAKA, KYOTO, TOKYO], 2026, 10)];
  const s = spotlight(js, trips(js), OPTS);
  assert.equal(s.overview.land.latest, cropLand(s.overview.cells, (iso) => (iso === 'JP' ? 1 : 0), 2)[1]);
});

test('a mark home shares with the latest trip names the trip\'s places first, on the card as when lit', () => {
  const WOLLONGONG = p('Wollongong', 'AU', -34.4278, 150.8931);
  const KATOOMBA = p('Katoomba', 'AU', -33.7125, 150.3119);
  const js = [...LIFE, ...round([WOLLONGONG, KATOOMBA], 2027, 1)];
  const ts = trips(js);
  const card = mapModel(js, ts, CARD);
  for (const layer of card.layers) assert.ok(layer.labels.some((l) => /^(WOLLONGONG|KATOOMBA)/.test(l.text)), layer.labels.map((l) => l.text).join(', '));
});

/**
 * At every width a layer is drawn: a mark is named once at most, labels never overlap or leave the map, and no
 * label covers a named mark or a place the trip reached (a forced label may cover a faint mark, home, or where
 * the trip set off from, unnamed).
 */
function labelsHold(where: string, layers: Array<{ minW: number; maxW: number; labels: Array<{ key: string; left: number; top: number; text: string; anchor: Anchor }> }>, marksAt: (w: number) => Array<{ key: string; left: number; top: number; size: number; own: boolean }>, frame: { w: number; h: number }) {
  const overlaps = (p: Box, q: Box) => p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b;
  for (const layer of layers) {
    const keys = layer.labels.map((l) => l.key);
    assert.equal(new Set(keys).size, keys.length, `${where} ${layer.minW}px: a mark named twice (${keys.join(', ')})`);
    for (let W = layer.minW; W <= layer.maxW; W = W === layer.maxW ? W + 1 : Math.min(W + 10, layer.maxW)) {
      const s = W / frame.w;
      const H = frame.h * s;
      const marks = marksAt(W);
      const boxes = layer.labels.map((l) => labelBox(l.left * frame.w, l.top * frame.h, l.anchor, l.text, W, frame.w));
      boxes.forEach((b, k) => boxes.slice(k + 1).forEach((c, n) => assert.ok(!overlaps(b, c), `${where} ${W}px: ${layer.labels[k].text} over ${layer.labels[k + 1 + n].text}`)));
      for (const l of layer.labels) {
        const b = labelBox(l.left * frame.w, l.top * frame.h, l.anchor, l.text, W, frame.w);
        assert.ok(b.l >= 0 && b.t >= 0 && b.r <= W && b.b <= H, `${where} ${W}px: ${l.text} leaves the map`);
        for (const m of marks) {
          if (m.key === l.key || !(m.own || keys.includes(m.key))) continue;
          const r = m.size / 2 + 2;
          const x = m.left * frame.w * s;
          const y = m.top * frame.h * s;
          assert.ok(!overlaps(b, { l: x - r, t: y - r, r: x + r, b: y + r }), `${where} ${W}px: ${l.text} covers ${m.key}`);
        }
      }
    }
  }
}

test('labels never overlap, cover a named mark or a trip\'s own, never twice, never off the map: card, overview and every lit trip', () => {
  for (const [name, js] of Object.entries(ALL)) {
    const ts = trips(js);
    const s = spotlight(js, ts, OPTS);
    const frame = { w: s.overview.w, h: s.overview.h };
    const card = mapModel(js, ts, CARD);
    const kindMarks = (layers: typeof card.layers) => (w: number) => at(layers, w).marks.map((m) => ({ ...m, size: m.kind === 'now' ? 9 : 7, own: m.kind === 'now' }));
    labelsHold(`${name} card`, card.layers, kindMarks(card.layers), { w: card.w, h: card.h });
    labelsHold(`${name} overview`, s.overview.layers, kindMarks(s.overview.layers), frame);
    for (const set of s.labelSets) {
      labelsHold(`${name} trip ${set.trips.join(' ')}`, set.layers, (w) => {
        const lit = at(set.layers, w).marks;
        return at(s.base, w).marks.map((m) => {
          const mine = lit.find((x) => x.key === m.key);
          return { ...m, size: mine ? 9 : 7, own: !!mine && mine.kind === 'now' };
        });
      }, frame);
    }
  }
});

test("the overview lights the latest trip's countries as the card does, where it set off from included", () => {
  const js = [j(HANOI, SINGAPORE, 2017, 8)];
  const s = spotlight(js, trips(js), OPTS);
  assert.equal(s.overview.land.latest, cropLand(s.overview.cells, (iso) => (iso === 'VN' || iso === 'SG' ? 1 : 0), 2)[1]);
  // A lit trip lights only where it went.
  assert.deepEqual(s.landSets.map((g) => g.countries), [['c-SG']]);
});

test('labels: faint marks block a label but are no rivals for it; a label that must show gives up the nearness rule, then may cover a faint mark', () => {
  const frame = { w: 100, h: 60 };
  // A lit mark with faint marks 12px above and below it: a label beside it is nearer one of them than the rule allows.
  const marks = [{ x: 50, y: 30, size: 9 }, { x: 50, y: 25, size: 7 }, { x: 50, y: 35, size: 7 }];
  const wants = [{ mark: 0, texts: ['KYOTO'] }];
  assert.deepEqual(placeLabels(marks, wants, frame, 240, 240), []);
  assert.equal(placeLabels(marks, wants, frame, 240, 240, { rivals: (i) => i === 0 }).length, 1);
  const must = placeLabels(marks, [{ mark: 0, texts: ['KYOTO · OSAKA', 'KYOTO +1'], must: true }], frame, 240, 240);
  assert.deepEqual(must.map((l) => l.text), ['KYOTO +1']);
  // Hemmed in on every side, 8px off: only covering a faint mark leaves room, and only a coverable one.
  const ring = [{ x: 50, y: 30, size: 9 }, ...[[-3.4, 0], [3.4, 0], [0, -3.4], [0, 3.4], [-3, -3], [3, -3], [-3, 3], [3, 3]].map(([dx, dy]) => ({ x: 50 + dx, y: 30 + dy, size: 7 }))];
  const hemmed = [{ mark: 0, texts: ['KYOTO'], must: true }];
  assert.deepEqual(placeLabels(ring, hemmed, frame, 240, 240), []);
  assert.equal(placeLabels(ring, hemmed, frame, 240, 240, { coverable: (i) => i > 0 }).length, 1);
  // Waiving the nearness rule comes before covering anything: W is free but too near another mark, E covers one.
  const nearFirst = [{ x: 50, y: 30, size: 9 }, { x: 54, y: 30, size: 7 }, { x: 50, y: 26, size: 7 }, { x: 50, y: 34, size: 7 }];
  const forced = placeLabels(nearFirst, [{ mark: 0, texts: ['KYOTO'], must: true }], frame, 240, 240, { coverable: (i) => i === 1 });
  assert.deepEqual(forced.map((l) => l.anchor), ['W']);
  // Of several that must show, one is enough: the second is named when the first cannot be.
  const two = placeLabels(ring, [{ mark: 0, texts: ['KYOTO'], must: true }, { mark: 1, texts: ['NARA'], must: true }], frame, 240, 240, { coverable: () => false });
  assert.deepEqual(two.map((l) => l.text), ['NARA']);
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

test('trips that light the same are written once, with every trip they belong to', () => {
  const same = [...round([TOKYO], 2019, 4), ...round([SEOUL], 2021, 5), ...round([TOKYO], 2023, 4), ...round([TOKYO], 2025, 9)];
  const s = spotlight(same, trips(same), OPTS);
  assert.deepEqual(s.labelSets.map((g) => g.trips), [[0, 2, 3], [1]]);
  assert.deepEqual(s.routeSets.map((g) => g.trips), [[0, 2, 3], [1]]);
  assert.deepEqual(s.landSets.map((g) => g.trips), [[0, 2, 3], [1]]);
});

test('64 different trips stay inside the budget the home page can carry', () => {
  const pool = [TOKYO, HANOI, SINGAPORE, BANGKOK, SEOUL, AUCKLAND, KL, PENANG, OSAKA];
  const many: Journey[] = [];
  for (let n = 0; n < 64; n++) {
    // 64 different ordered pairs of places: the second is 1 to 8 places on from the first.
    const a = pool[n % 9];
    const b = pool[((n % 9) + 1 + Math.floor(n / 9)) % 9];
    many.push(...round([a, b], 1995 + Math.floor(n / 2), n % 5 === 4 ? undefined : ((n * 5) % 12) + 1));
  }
  const ts = trips(many);
  assert.equal(ts.length, 64);
  const s = spotlight(many, ts, OPTS);
  assert.equal(s.labelSets.length, 64, 'every trip different');
  // What the dialog writes for each trip: measured at about 2 KB a trip as JSON (130 KB here).
  const bytes = JSON.stringify({ labelSets: s.labelSets, routeSets: s.routeSets, landSets: s.landSets }).length;
  assert.ok(bytes < 64 * 2.5 * 1024, `${bytes} bytes for 64 trips`);
});

test("the label anchors in the CSS are the placer's", () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  for (const [a, t] of Object.entries(LABEL_TRANSFORM) as Array<[Anchor, string]>) assert.ok(css.includes(`.tmap-a-${a} { transform: ${t}; }`), `.tmap-a-${a}`);
});
