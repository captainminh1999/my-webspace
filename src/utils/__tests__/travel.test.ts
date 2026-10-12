import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME, countryOf, distanceKm, formatKm, landPaths, newestFirst, parseJourneys, places, project, route, routes, summarize, when } from '../travel.ts';
import { GRID, RUNS } from '../../lib/worldMap.ts';
import type { Journey, Mode, Place } from '../../types/travel.ts';

const p = (city: string, country: string, lat: number, lon: number): Place => ({ city, country, lat, lon });
const SYD = p('Sydney', 'AU', -33.8688, 151.2093);
const LONDON = p('London', 'GB', 51.5072, -0.1276);
const PARIS = p('Paris', 'FR', 48.8566, 2.3522);
const TOKYO = p('Tokyo', 'JP', 35.6762, 139.6503);
const HANOI = p('Hanoi', 'VN', 21.0285, 105.8542);
const SAIGON = p('Ho Chi Minh City', 'VN', 10.7769, 106.7009);
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

test('distances read to the nearest 10 km with a thousands separator', () => {
  assert.equal(formatKm(16_993.4), '16,990');
  assert.equal(formatKm(7_825), '7,830');
  assert.equal(formatKm(4), '0');
});

test('the board reads newest first by year and month; within a month the journey stored later comes first; no month comes last in its year', () => {
  const a = j(SYD, HANOI, 2026, 10);
  const b = j(HANOI, SAIGON, 2026, 10);
  const c = j(SYD, TOKYO, 2026);
  const d = j(SYD, LONDON, 2025, 12);
  const e = j(SYD, PARIS, 2026, 3);
  assert.deepEqual(newestFirst([a, b, c, d, e]).map(leg), ['Hanoi>Ho Chi Minh City', 'Sydney>Hanoi', 'Sydney>Paris', 'Sydney>Tokyo', 'Sydney>London']);
  assert.deepEqual(newestFirst(TRIPS).map(leg).slice(0, 3), ['Ho Chi Minh City>Sydney', 'Hanoi>Ho Chi Minh City', 'Sydney>Hanoi']);
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

test('a pair of places is one line on the map, whichever way and however often it was travelled, drawn as its latest journey', () => {
  assert.deepEqual(routes(TRIPS).map((r) => `${r.from.city}>${r.to.city} ${r.year}`), [
    'Sydney>London 2018',
    'London>Paris 2018',
    'Paris>Sydney 2018',
    'Tokyo>Sydney 2024',
    'Sydney>Hanoi 2026',
    'Hanoi>Ho Chi Minh City 2026',
    'Ho Chi Minh City>Sydney 2026',
  ]);
  assert.deepEqual(routes([...TRIPS, j(HANOI, SYD, 2027, 2)]).at(-1), { from: HANOI, to: SYD, year: 2027 });
});

test('the summary counts places, journeys and distance travelled, and fills the empty years', () => {
  const sum = summarize(TRIPS);
  assert.deepEqual(sum.countries, ['VN', 'JP', 'FR', 'GB']);
  assert.equal(sum.cities, 5);
  assert.equal(sum.journeys, 8);
  assert.deepEqual(sum.byContinent, [
    { continent: 'AS', countries: 2 },
    { continent: 'EU', countries: 2 },
  ]);
  assert.equal(sum.since, 2018);
  assert.deepEqual(sum.perYear.map((y) => y.journeys), [3, 0, 0, 0, 0, 0, 2, 0, 3]);
  near(sum.km, 65_690); // every journey counts, Sydney-Tokyo twice
  assert.equal(sum.longest && leg(sum.longest.journey), 'Sydney>London');
  assert.equal(sum.farthest?.place.city, 'London');
});

test('an empty list summarises to nothing rather than throwing', () => {
  const sum = summarize([]);
  assert.equal(sum.cities, 0);
  assert.equal(sum.journeys, 0);
  assert.equal(sum.km, 0);
  assert.equal(sum.since, null);
  assert.deepEqual(sum.perYear, []);
  assert.equal(sum.longest, null);
  assert.equal(sum.farthest, null);
});

test('stored journeys are checked at the door: bad ones are dropped, good ones normalised', () => {
  const good = { from: { city: ' Sydney ', country: 'au', lat: -33.8688, lon: 151.2093 }, to: { city: 'Hanoi', country: 'VN', lat: 21.0285, lon: 105.8542, iata: 'HAN' }, year: 2025, month: 11, by: 'Air', _id: 'x', basis: 'not shown' };
  assert.deepEqual(parseJourneys([good]), [{ from: SYD, to: HANOI, year: 2025, month: 11, by: 'air' }]);
  assert.deepEqual(parseJourneys([{ ...good, month: undefined, by: undefined }])[0], { from: SYD, to: HANOI, year: 2025 });
  assert.deepEqual(parseJourneys([{ ...good, by: 'train' }])[0], { from: SYD, to: HANOI, year: 2025, month: 11 }, 'an unknown mode loses the mode, not the journey');
  for (const bad of [
    { ...good, from: undefined },
    { ...good, to: 'Hanoi' },
    { ...good, to: { ...good.to, city: ' ' } },
    { ...good, to: { ...good.to, country: 'UK' } }, // not ISO alpha-2: the map would not know it
    { ...good, to: { ...good.to, lat: 91 } },
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

test('the projection puts the grid corners at the viewBox corners', () => {
  assert.deepEqual(project(GRID.north, -180), { x: 0, y: 0 });
  assert.deepEqual(project(GRID.north - GRID.rows * GRID.step, 180), { x: GRID.cols, y: GRID.rows });
});

test('every run of land is drawn exactly once, lit only when its country was visited', () => {
  const { lit, rest } = landPaths(['jp', 'SG']);
  // Every dot a path draws, as "col,row" cells: touching runs are merged, so compare dots, not subpaths.
  const dots = (d: string) => [...d.matchAll(/M(\d+) ([\d.]+)h(\d+)/g)].flatMap(([, c, r, n]) => Array.from({ length: +n }, (_, i) => `${+c + i},${+r - 0.5}`)).sort();
  const want = (keep: (code: string | null) => boolean) => RUNS.filter((r) => keep(r[3])).flatMap(([row, col, len]) => Array.from({ length: len }, (_, i) => `${col + i},${row}`)).sort();
  const visited = (code: string | null) => code === 'JP' || code === 'SG';
  assert.deepEqual(dots(lit), want(visited));
  assert.deepEqual(dots(rest), want((code) => !visited(code)));
  assert.ok(dots(lit).length > 0);
  assert.ok((rest.match(/M/g) ?? []).length < RUNS.length, 'touching runs are merged');
  assert.equal(landPaths([]).lit, '');
});

test('a route over the Pacific runs on past the right edge and is shifted back in at the left; one inside the map needs no copy', () => {
  const pacific = route(HOME, SF);
  assert.equal((pacific.d.match(/M/g) ?? []).length, 1);
  assert.equal(pacific.shift, -GRID.cols);
  const xs = [...pacific.d.matchAll(/[ML](-?[\d.]+) /g)].map((m) => Number(m[1]));
  assert.ok(xs.at(-1)! > GRID.cols, 'ends beyond the right edge');
  assert.ok(Math.abs(xs.at(-1)! + pacific.shift - project(SF.lat, SF.lon).x) < 0.1, 'the shifted copy ends at San Francisco');
  const tokyo = route(HOME, TOKYO);
  assert.equal(tokyo.shift, 0);
  assert.ok(Math.max(...[...tokyo.d.matchAll(/[ML](-?[\d.]+) /g)].map((m) => Number(m[1]))) <= GRID.cols);
  assert.deepEqual(route(HOME, HOME), { d: '', shift: 0 });
});

test('a short route takes a few points, a long one more, never past the cap', () => {
  const points = (d: string) => (d.match(/[ML]/g) ?? []).length;
  const melbourne = route(HOME, { lat: -37.8136, lon: 144.9631 }).d;
  assert.ok(points(melbourne) <= 4, melbourne);
  assert.ok(points(route(HOME, LONDON).d) > 30);
  assert.ok(points(route(HOME, LONDON, 10).d) <= 11);
});

test('every country Natural Earth draws has at least one dot, and overseas territories are their own', () => {
  const codes = new Set(RUNS.map((r) => r[3]));
  for (const c of ['IL', 'PS', 'MK', 'AL', 'JE', 'GG', 'LC', 'VC', 'SG', 'HK', 'MT', 'GF', 'RE', 'BQ', 'TK', 'SJ']) assert.ok(codes.has(c), c);
  // France's own dots are all in Europe: none west of 30°W
  assert.deepEqual(RUNS.filter((r) => r[3] === 'FR' && r[1] < (-30 - GRID.west) / GRID.step), []);
});
