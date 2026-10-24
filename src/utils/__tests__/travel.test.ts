import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME, chronological, countryOf, distanceKm, formatKm, itinerary, legKm, monthsBetween, newestFirst, parseJourneys, placeVisits, places, quietYears, railMarks, span, summarize, trips, when } from '../travel.ts';
import { APAC_MIN, arc, at, cells, cropLand, fitFrame, mapModel, placeLabels } from '../travelMap.ts';
import { GRID, RUNS } from '../../lib/worldMap.ts';
import type { Journey, Mode, Place } from '../../types/travel.ts';

const p = (city: string, country: string, lat: number, lon: number): Place => ({ city, country, lat, lon });
const SYD = p('Sydney', 'AU', -33.8688, 151.2093);
const LONDON = p('London', 'GB', 51.5072, -0.1276);
const PARIS = p('Paris', 'FR', 48.8566, 2.3522);
const TOKYO = p('Tokyo', 'JP', 35.6762, 139.6503);
const OSAKA = p('Osaka', 'JP', 34.6937, 135.5023);
const HANOI = p('Hanoi', 'VN', 21.0285, 105.8542);
const NINH_BINH = p('Ninh Binh', 'VN', 20.2506, 105.9745);
const SAIGON = p('Ho Chi Minh City', 'VN', 10.7769, 106.7009);
const SINGAPORE = p('Singapore', 'SG', 1.2903, 103.852);
const JOHOR = p('Johor Bahru', 'MY', 1.4927, 103.7414);
const DUBAI = p('Dubai', 'AE', 25.2048, 55.2708);
const SF = p('San Francisco', 'US', 37.7749, -122.4194);
const j = (from: Place, to: Place, year: number, month?: number, by?: Mode): Journey => ({ from, to, year, ...(month ? { month } : {}), ...(by ? { by } : {}) });

// Three trips, stored in the order travelled: Sydney-London-Paris-Sydney, Sydney-Tokyo and back, Sydney-Hanoi-Saigon-Sydney.
const TRIPS = [
  j(SYD, LONDON, 2018, 6, 'air'),
  j(LONDON, PARIS, 2018, 6, 'land'),
  j(PARIS, SYD, 2018, 7, 'air'),
  j(SYD, TOKYO, 2024, 3, 'air'),
  j(TOKYO, SYD, 2024, 3, 'air'),
  j(SYD, HANOI, 2026, 10, 'air'),
  j(HANOI, SAIGON, 2026, 10, 'air'),
  j(SAIGON, SYD, 2026, 10, 'air'),
];
// Years lived elsewhere: moved to Singapore, home to Hanoi and back, on to Dubai, back to Hanoi, then to Sydney.
const ABROAD = [
  j(HANOI, SINGAPORE, 2017, 8, 'air'),
  j(SINGAPORE, HANOI, 2018, 1, 'air'),
  j(HANOI, SINGAPORE, 2018, 1, 'air'),
  j(SINGAPORE, HANOI, 2018, 8, 'air'),
  j(HANOI, DUBAI, 2018, 8, 'air'),
  j(DUBAI, HANOI, 2019, 4, 'air'),
  j(HANOI, SYD, 2019, 8, 'air'),
  j(SYD, HANOI, 2024, 3, 'air'),
];
const leg = (x: Journey) => `${x.from.city}>${x.to.city}`;
const near = (got: number, want: number) => assert.ok(Math.abs(got - want) / want < 0.005, `${got} vs ${want}`);

test('great-circle distances match the published figures to within 0.5 %', () => {
  near(distanceKm(HOME, LONDON), 16_990);
  near(distanceKm(HOME, TOKYO), 7_820);
  near(distanceKm(HOME, SF), 11_940);
  near(distanceKm(LONDON, PARIS), 344);
  near(distanceKm(HANOI, SAIGON), 1_140);
  assert.equal(distanceKm(HOME, HOME), 0);
});

test('distances read to the nearest 10 km, and totals add the figures as printed', () => {
  assert.equal(formatKm(16_993.4), '16,990');
  assert.equal(formatKm(7_825), '7,830');
  assert.equal(formatKm(4), '0');
  // Singapore to Johor Bahru is about 26 km: each way prints 30, so the trip prints 60, not 50.
  assert.equal(legKm(j(SINGAPORE, JOHOR, 2018)), 30);
  assert.equal(trips([j(SINGAPORE, JOHOR, 2018, 7), j(JOHOR, SINGAPORE, 2018, 7)])[0].km, 60);
  assert.equal(summarize(TRIPS).km, TRIPS.reduce((s, x) => s + legKm(x), 0));
});

test('the board reads newest first by year and month; within a month the journey stored later comes first; no month comes last in its year', () => {
  const a = j(SYD, HANOI, 2026, 10);
  const b = j(HANOI, SAIGON, 2026, 10);
  const c = j(SYD, TOKYO, 2026);
  const d = j(SYD, LONDON, 2025, 12);
  const e = j(SYD, PARIS, 2026, 3);
  assert.deepEqual(newestFirst([a, b, c, d, e]).map(leg), ['Hanoi>Ho Chi Minh City', 'Sydney>Hanoi', 'Sydney>Paris', 'Sydney>Tokyo', 'Sydney>London']);
});

test('a journey reads as month and year when the month is known', () => {
  assert.equal(when({ year: 2026, month: 10 }), 'OCT 2026');
  assert.equal(when({ year: 2017, month: 1 }), 'JAN 2017');
  assert.equal(when({ year: 2019 }), '2019');
});

test('every place a journey touches is one place, home aside, at its latest journey; the match ignores case and spacing', () => {
  assert.deepEqual(places(TRIPS).map((x) => `${x.city} ${when(x)}`), ['Ho Chi Minh City OCT 2026', 'Hanoi OCT 2026', 'Tokyo MAR 2024', 'Paris JUL 2018', 'London JUN 2018']);
  const again = j({ ...HANOI, city: ' hanoi ' }, SYD, 2027, 1);
  assert.deepEqual(places([...TRIPS, again]).map((x) => x.city), [' hanoi ', 'Ho Chi Minh City', 'Tokyo', 'Paris', 'London']);
  assert.equal(places([j(LONDON, { ...SYD, city: 'SYDNEY' }, 2020)]).length, 1, 'home is matched without regard to case');
});

test('the summary counts places and journeys, and fills the empty years', () => {
  const sum = summarize(TRIPS);
  assert.deepEqual(sum.countries, ['VN', 'JP', 'FR', 'GB']);
  assert.equal(sum.cities, 5);
  assert.equal(sum.journeys, 8);
  assert.equal(sum.since, 2018);
  assert.deepEqual(sum.perYear.map((y) => y.journeys), [3, 0, 0, 0, 0, 0, 2, 0, 3]);
  near(sum.km, 65_690); // every journey counts, Sydney-Tokyo twice
  assert.equal(sum.farthest?.place.city, 'London');
  const empty = summarize([]);
  assert.deepEqual([empty.cities, empty.journeys, empty.km, empty.since, empty.perYear.length, empty.farthest], [0, 0, 0, null, 0, null]);
});

test('stored journeys are checked at the door: bad ones are dropped, good ones normalised', () => {
  const good = { from: { city: ' Sydney ', country: 'au', lat: -33.8688, lon: 151.2093 }, to: { city: 'Hanoi', country: 'VN', lat: 21.0285, lon: 105.8542, iata: 'HAN' }, year: 2025, month: 11, by: 'Air', _id: 'x', basis: 'not shown' };
  assert.deepEqual(parseJourneys([good]), [{ from: SYD, to: HANOI, year: 2025, month: 11, by: 'air' }]);
  assert.deepEqual(parseJourneys([{ ...good, month: undefined, by: undefined }])[0], { from: SYD, to: HANOI, year: 2025 });
  assert.deepEqual(parseJourneys([{ ...good, by: 'boat' }])[0], { from: SYD, to: HANOI, year: 2025, month: 11 }, 'an unknown mode loses the mode, not the journey');
  assert.equal(parseJourneys([{ ...good, by: 'rail' }])[0].by, 'rail');
  for (const bad of [
    { ...good, from: undefined },
    { ...good, to: 'Hanoi' },
    { ...good, to: { ...good.to, city: ' ' } },
    { ...good, to: { ...good.to, country: 'UK' } }, // not ISO alpha-2: the map would not know it
    { ...good, to: { ...good.to, lat: 91 } },
    { ...good, to: { ...good.to, lon: 181 } },
    { ...good, to: { ...good.to, lat: Number.NaN } },
    { ...good, to: { ...good.to, lon: '105' } },
    { ...good, to: { ...good.from, city: 'SYDNEY' } }, // both ends the same place
    { ...good, year: 25 },
    { ...good, year: 2025.5 },
    { ...good, month: 13 },
    { ...good, month: 0 },
    null,
    'Hanoi',
  ]) assert.deepEqual(parseJourneys([bad]), [], JSON.stringify(bad));
  assert.deepEqual(parseJourneys(undefined), []);
  assert.deepEqual(parseJourneys({ from: SYD, to: HANOI, year: 2025 }), []);
});

test('countries are looked up by ISO code, with an unknown code standing for itself', () => {
  assert.deepEqual(countryOf('VN'), { name: 'Vietnam', continent: 'AS' });
  assert.deepEqual(countryOf('hk'), { name: 'Hong Kong', continent: 'AS' });
  assert.deepEqual(countryOf('XX'), { name: 'XX', continent: null });
});

test('months between journeys; with a month missing, the gap is the smallest it could be', () => {
  assert.equal(monthsBetween({ year: 2017, month: 8 }, { year: 2018, month: 1 }), 5);
  assert.equal(monthsBetween({ year: 2026, month: 10 }, { year: 2026, month: 10 }), 0);
  assert.equal(monthsBetween({ year: 2026 }, { year: 2026, month: 12 }), 0);
  assert.equal(monthsBetween({ year: 2026, month: 12 }, { year: 2027 }), 1);
  assert.equal(monthsBetween({ year: 2024 }, { year: 2026 }), 13);
  // One month known: the missing one is the one that makes the gap smallest.
  assert.equal(monthsBetween({ year: 2017, month: 1 }, { year: 2018 }), 12);
  assert.equal(monthsBetween({ year: 2017 }, { year: 2018, month: 12 }), 12);
  assert.equal(monthsBetween({ year: 2017, month: 8 }, { year: 2019 }), 17);
  const cut = trips([j(SYD, HANOI, 2017, 1), j(HANOI, SAIGON, 2018), j(SAIGON, SYD, 2018)]);
  assert.deepEqual(cut.map((t) => [t.end, t.stay?.months]), [['stay', 12], ['home', undefined]]);
});

test('round trips from Sydney are one trip each, closed when they get home', () => {
  const ts = trips(TRIPS);
  assert.deepEqual(ts.map((t) => [t.stops.map((s) => s.city).join('>'), t.end]), [
    ['Sydney>London>Paris>Sydney', 'round'],
    ['Sydney>Tokyo>Sydney', 'round'],
    ['Sydney>Hanoi>Ho Chi Minh City>Sydney', 'round'],
  ]);
  assert.equal(ts[0].km, legKm(TRIPS[0]) + legKm(TRIPS[1]) + legKm(TRIPS[2]));
});

test('years lived elsewhere read as trips from there: a stay of three months ends a trip, reaching Sydney ends one, the last is open', () => {
  const ts = trips(ABROAD);
  assert.deepEqual(ts.map((t) => [t.stops.map((s) => s.city).join('>'), t.end, t.stay ? `${t.stay.months} mo in ${t.stay.place.city}` : '']), [
    ['Hanoi>Singapore', 'stay', '12 mo in Singapore'], // the January trip to Hanoi and back is part of the year there
    ['Singapore>Hanoi>Singapore', 'round', ''],
    ['Singapore>Hanoi>Dubai', 'stay', '8 mo in Dubai'],
    ['Dubai>Hanoi', 'stay', '4 mo in Hanoi'],
    ['Hanoi>Sydney', 'home', ''],
    ['Sydney>Hanoi', 'open', ''],
  ]);
});

test('a round trip out of a place lived in is part of the stay, not the end of it', () => {
  const CAT_BA = p('Cat Ba', 'VN', 20.7266, 107.0479);
  const between = [j(DUBAI, HANOI, 2019, 4), j(HANOI, CAT_BA, 2019, 6, 'land'), j(CAT_BA, HANOI, 2019, 6, 'land'), j(HANOI, SYD, 2019, 8)];
  assert.deepEqual(trips(between).map((t) => [t.stops.map((s) => s.city).join('>'), t.end, t.stay?.months]), [
    ['Dubai>Hanoi', 'stay', 4],
    ['Hanoi>Cat Ba>Hanoi', 'round', undefined],
    ['Hanoi>Sydney', 'home', undefined],
  ]);
  // A short stay with a side trip stays one trip.
  const holiday = [j(SYD, HANOI, 2025, 11), j(HANOI, NINH_BINH, 2025, 12), j(NINH_BINH, HANOI, 2025, 12), j(HANOI, SAIGON, 2025, 12), j(SAIGON, SYD, 2025, 12)];
  assert.deepEqual(trips(holiday).map((t) => t.legs.length), [5]);
  // Away for a year and back is a move, not a round trip out of the first place: two months in Singapore is
  // a stop on the way to Dubai, the year in Dubai a stay, and three months back in Singapore another.
  const moved = [j(HANOI, SINGAPORE, 2017, 8), j(SINGAPORE, DUBAI, 2017, 10), j(DUBAI, SINGAPORE, 2018, 10), j(SINGAPORE, SYD, 2019, 1)];
  assert.deepEqual(trips(moved).map((t) => [t.stops.map((s) => s.city).join('>'), t.stay?.months ?? null]), [
    ['Hanoi>Singapore>Dubai', 12],
    ['Dubai>Singapore', 3],
    ['Singapore>Sydney', null],
  ]);
});

test('journeys come back in the order travelled, whatever order they were stored in', () => {
  const CAT_BA = p('Cat Ba', 'VN', 20.7266, 107.0479);
  const stored = [j(DUBAI, HANOI, 2019, 4), j(HANOI, SYD, 2019, 8), j(SYD, TOKYO, 2026, 10), j(HANOI, CAT_BA, 2019, 6), j(CAT_BA, HANOI, 2019, 6)];
  assert.deepEqual(chronological(stored).map(leg), ['Dubai>Hanoi', 'Hanoi>Cat Ba', 'Cat Ba>Hanoi', 'Hanoi>Sydney', 'Sydney>Tokyo']);
  // Same month: the stored order; no month: its place among the year's.
  const sameMonth = [j(OSAKA, TOKYO, 2026, 10), j(SYD, OSAKA, 2026, 10)];
  assert.deepEqual(chronological(sameMonth).map(leg), ['Osaka>Tokyo', 'Sydney>Osaka']);
  const noMonth = [j(SYD, HANOI, 2019, 3), j(HANOI, SYD, 2019), j(SYD, PARIS, 2019, 1)];
  assert.deepEqual(chronological(noMonth).map(leg), ['Sydney>Paris', 'Hanoi>Sydney', 'Sydney>Hanoi']);
  const raw = stored.map((x) => ({ ...x }));
  assert.deepEqual(parseJourneys(raw).map(leg), chronological(stored).map(leg), 'parseJourneys returns them in order');
});

test('a chain that breaks ends the trip; a missing month never cuts a trip that might be whole', () => {
  assert.deepEqual(trips([j(SYD, HANOI, 2024, 3), j(SINGAPORE, SYD, 2024, 4)]).map((t) => t.end), ['break', 'home']);
  const newYear = trips([j(SYD, TOKYO, 2026, 12), j(TOKYO, OSAKA, 2027), j(OSAKA, SYD, 2027, 1)]);
  assert.deepEqual(newYear.map((t) => [t.legs.length, t.end]), [[3, 'round']]);
  assert.deepEqual(trips([]), []);
});

test('a trip reads as its first and last month', () => {
  const ts = trips([j(SYD, TOKYO, 2026, 10), j(TOKYO, SYD, 2026, 10), j(SYD, HANOI, 2024, 3), j(HANOI, SYD, 2024, 4), j(SYD, LONDON, 2026, 12), j(LONDON, SYD, 2027, 1), j(SYD, PARIS, 2019), j(PARIS, SYD, 2019)]);
  assert.deepEqual(ts.map(span), ['OCT 2026', 'MAR – APR 2024', 'DEC 2026 – JAN 2027', '2019']);
});

test('a short there-and-back is folded into the stop it left from; the trip itself and long ones are not', () => {
  const read = (js: Journey[]) => itinerary(trips(js)[0]).map((s) => s.place.city + (s.side.length ? ` (${s.side.map((x) => x.city).join(', ')})` : ''));
  assert.deepEqual(read([j(SYD, HANOI, 2025, 11), j(HANOI, NINH_BINH, 2025, 12), j(NINH_BINH, HANOI, 2025, 12), j(HANOI, SAIGON, 2025, 12), j(SAIGON, SYD, 2025, 12)]), ['Sydney', 'Hanoi (Ninh Binh)', 'Ho Chi Minh City', 'Sydney']);
  assert.deepEqual(read([j(SINGAPORE, JOHOR, 2018, 7), j(JOHOR, SINGAPORE, 2018, 7)]), ['Singapore', 'Johor Bahru', 'Singapore']);
  assert.deepEqual(read([j(SYD, HANOI, 2019, 1), j(HANOI, DUBAI, 2019, 1), j(DUBAI, HANOI, 2019, 2), j(HANOI, SYD, 2019, 2)]), ['Sydney', 'Hanoi', 'Dubai', 'Hanoi', 'Sydney']);
});

test('a place is counted once per trip that stopped there', () => {
  const visits = placeVisits(trips([...ABROAD]));
  const of = (city: string) => visits.find((v) => v.city === city);
  assert.equal(of('Hanoi')?.trips, 6);
  assert.equal(of('Singapore')?.trips, 3);
  assert.equal(of('Dubai')?.last, 3);
});

test('trips sit on the month rail without touching, a missing month covering its year', () => {
  const ts = trips([j(SYD, HANOI, 2024, 3), j(HANOI, SYD, 2024, 4), j(SYD, TOKYO, 2024, 5), j(TOKYO, SYD, 2024, 5), j(SYD, PARIS, 2025), j(PARIS, SYD, 2025)]);
  const marks = railMarks(ts, 2024, 2025);
  assert.deepEqual(marks.map((m) => [m.left * 24, m.width * 24, m.lane, m.known]), [
    [2, 2, 0, true],
    [4, 1, 1, true], // starts the month after the last one ended: the other lane
    [12, 12, 0, false],
  ]);
  const busy = trips([SINGAPORE, SINGAPORE, SINGAPORE, SINGAPORE].flatMap((_, i) => [j(SINGAPORE, i % 2 ? JOHOR : HANOI, 2018, i < 3 ? 3 : 4), j(i % 2 ? JOHOR : HANOI, SINGAPORE, 2018, i < 3 ? 3 : 4)]));
  const lanes = railMarks(busy, 2018, 2018);
  assert.deepEqual(lanes.map((m) => m.lane), [0, 1, 2, 3], 'a third trip in one month gets a lane of its own, and so does April, which would touch each of them');
  for (const [i, a] of lanes.entries()) for (const b of lanes.slice(i + 1)) if (a.lane === b.lane) assert.ok(b.left > a.left + a.width || a.left > b.left + b.width, 'never touching in one lane');
  assert.deepEqual(quietYears([{ year: 2017, journeys: 2 }, { year: 2018, journeys: 0 }, { year: 2019, journeys: 0 }, { year: 2020, journeys: 1 }, { year: 2021, journeys: 0 }]), [[2018, 2019], [2021, 2021]]);
});

test('the map is framed on the places travelled, never smaller than Asia-Pacific, and a Pacific crossing grows it east rather than flipping', () => {
  const hanoiOnly = fitFrame([HANOI], 1.2, 2);
  assert.ok(hanoiOnly.west <= APAC_MIN.west && hanoiOnly.east >= APAC_MIN.east && hanoiOnly.south <= APAC_MIN.south && hanoiOnly.north >= APAC_MIN.north);
  assert.ok(fitFrame([HANOI, DUBAI], 1.2, 2).west < DUBAI.lon, 'Dubai is inside');
  const pacific = fitFrame([SF], 1.2, 2.6);
  assert.ok(pacific.east > 180 && pacific.east < 260 && pacific.west > 60, JSON.stringify(pacific));
  for (const f of [hanoiOnly, pacific, fitFrame([LONDON, SF], 1.2, 2.6)]) {
    const a = (f.east - f.west) / (f.north - f.south);
    assert.ok(a >= 1.2 - 1e-9 && a <= 2.6 + 1e-9 && f.north <= 84 && f.south >= -56 && f.east - f.west <= 360, JSON.stringify(f));
  }
});

test('the cropped land has every dot of the grid inside the frame, each once, in its tier', () => {
  const c = cells(fitFrame([HANOI, DUBAI], 1.2, 2));
  const [rest, lit] = cropLand(c, (iso) => (iso === 'VN' ? 1 : 0), 2);
  const dots = (d: string) => [...d.matchAll(/M(\d+) ([\d.]+)h(\d+)/g)].reduce((s, m) => s + Number(m[3]), 0);
  const inside = (keep: (iso: string) => boolean) =>
    RUNS.filter((r) => keep(r[3]) && r[0] >= c.y0 && r[0] < c.y1).reduce((s, [, col, len]) => s + Math.max(0, Math.min(col + len, c.x1) - Math.max(col, c.x0)), 0);
  assert.equal(dots(lit), inside((iso) => iso === 'VN'));
  assert.equal(dots(rest), inside((iso) => iso !== 'VN'));
  assert.ok(dots(lit) > 0);
});

test('a route starts and ends at its places in the frame, unbroken across 180°', () => {
  const c = cells(fitFrame([SF], 1.2, 2.6));
  const xs = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const pts = xs(arc(SYD, SF, c));
  const [sx, sy] = [at(SYD, c), at(SF, c)];
  assert.ok(Math.abs(pts[0][0] - sx.x) < 0.1 && Math.abs(pts[0][1] - sx.y) < 0.1);
  assert.ok(Math.abs(pts.at(-1)![0] - sy.x) < 0.1 && Math.abs(pts.at(-1)![1] - sy.y) < 0.1, `${pts.at(-1)} vs ${JSON.stringify(sy)}`);
  for (let i = 1; i < pts.length; i++) assert.ok(Math.abs(pts[i][0] - pts[i - 1][0]) < c.w / 4, 'no jump across the map');
  assert.equal(arc(SYD, SYD, c), '');
  // Over the pole: the route leaves at the top and comes back in, and still ends at its mark.
  const NEW_YORK = p('New York', 'US', 40.7128, -74.006);
  const c2 = cells(fitFrame([HANOI, NEW_YORK, ...[HANOI, NEW_YORK]], 1.2, 2.6));
  const polar = xs(arc(HANOI, NEW_YORK, c2));
  const ny = at(NEW_YORK, c2);
  assert.ok(Math.abs(polar.at(-1)![0] - ny.x) < 0.1 && Math.abs(polar.at(-1)![1] - ny.y) < 0.1, `${polar.at(-1)} vs ${JSON.stringify(ny)}`);
});

test('a place or route south of the grid still gets room on the map', () => {
  const SANTIAGO = p('Santiago', 'CL', -33.4489, -70.6693);
  const ts = trips([j(SYD, SANTIAGO, 2027, 1), j(SANTIAGO, SYD, 2027, 2)]);
  const model = mapModel(ts.flatMap((t) => t.legs), ts, { aspect: [1.2, 2], drawnAt: 472, layers: [[240, 703]] });
  const ys = [...model.latest[0].d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));
  assert.ok(Math.max(...ys) <= model.h && Math.min(...ys) >= 0, `route rows ${Math.min(...ys)}..${Math.max(...ys)} in a frame ${model.h} high`);
  for (const m of model.layers[0].marks) assert.ok(m.top >= 0 && m.top <= 1, JSON.stringify(m));
});

test('labels stay inside the map, off other marks and labels, and nearer their own mark than any other', () => {
  const frame = { w: 100, h: 60 };
  const marks = [{ x: 50, y: 30, size: 7 }, { x: 53, y: 30, size: 7 }, { x: 98, y: 30, size: 7 }];
  const placed = placeLabels(marks, [{ mark: 0, texts: ['HANOI'] }, { mark: 1, texts: ['NINH BINH'] }, { mark: 2, texts: ['A VERY LONG NAME INDEED'] }], frame, 300, 600);
  const byMark = new Map(placed.map((l) => [l.mark, l]));
  assert.equal(byMark.get(0)?.anchor, 'W', 'E is towards the neighbour');
  assert.ok(!byMark.has(1) || byMark.get(1)!.anchor !== 'W', 'never over the first label');
  assert.ok(byMark.get(2) === undefined || ['W', 'NW', 'SW'].includes(byMark.get(2)!.anchor), 'never off the right edge');
});

test('the map model names the latest trip in front, keeps every mark inside the frame, and says what it shows', () => {
  const ts = trips([...TRIPS.slice(3), j(SYD, HANOI, 2027, 1), j(HANOI, NINH_BINH, 2027, 1), j(NINH_BINH, HANOI, 2027, 1), j(HANOI, SYD, 2027, 2)]);
  const model = mapModel([...TRIPS.slice(3), ...ts.at(-1)!.legs], ts, { aspect: [1.2, 2], drawnAt: 472, layers: [[296, 703]] });
  for (const layer of model.layers) {
    for (const m of [...layer.marks, ...layer.labels]) assert.ok(m.left >= 0 && m.left <= 1 && m.top >= 0 && m.top <= 1, JSON.stringify(m));
    assert.ok(layer.marks.some((m) => m.kind === 'home'));
    for (const l of layer.labels.filter((x) => x.kind === 'now')) assert.ok(!/TOKYO|SAIGON|HO CHI MINH/.test(l.text), l.text);
  }
  assert.equal(model.latest.length, 4);
  assert.ok(model.earlier.every((r) => r.opacity > 0 && r.opacity <= 1));
  assert.ok(model.label.startsWith('Map of 3 trips to 4 cities in 2 countries since 2024, from Hanoi in the west to Sydney in the east. The latest trip, January 2027, Sydney → Hanoi (Ninh Binh) → Sydney, is drawn in front'), model.label);
  assert.match(model.label, /Places: .*Tokyo/);
});

test('every country Natural Earth draws has at least one dot, and overseas territories are their own', () => {
  const codes = new Set(RUNS.map((r) => r[3]));
  for (const c of ['IL', 'PS', 'MK', 'AL', 'JE', 'GG', 'LC', 'VC', 'SG', 'HK', 'MT', 'GF', 'RE', 'BQ', 'TK', 'SJ']) assert.ok(codes.has(c), c);
  // France's own dots are all in Europe: none west of 30°W
  assert.deepEqual(RUNS.filter((r) => r[3] === 'FR' && r[1] < (-30 - GRID.west) / GRID.step), []);
});
