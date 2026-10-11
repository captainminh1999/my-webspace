import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME, countryOf, distanceKm, formatKm, landPaths, newestFirst, parseStops, places, project, route, summarize, when } from '../travel.ts';
import { GRID, RUNS } from '../../lib/worldMap.ts';
import type { TravelStop } from '../../types/travel.ts';

const s = (city: string, country: string, year: number, lat: number, lon: number): TravelStop => ({ city, country, year, lat, lon });
const TOKYO_19 = s('Tokyo', 'JP', 2019, 35.6762, 139.6503);
const TOKYO_26 = s('Tokyo', 'JP', 2026, 35.6762, 139.6503);
const LONDON = s('London', 'GB', 2024, 51.5072, -0.1276);
const PARIS = s('Paris', 'FR', 2024, 48.8566, 2.3522);
const SF = s('San Francisco', 'US', 2018, 37.7749, -122.4194);
const HOBART = s('Hobart', 'AU', 2026, -42.8821, 147.3272);

test('great-circle distances from Sydney match the published figures to within 0.5 %', () => {
  const near = (got: number, want: number) => assert.ok(Math.abs(got - want) / want < 0.005, `${got} vs ${want}`);
  near(distanceKm(HOME, LONDON), 16_990);
  near(distanceKm(HOME, TOKYO_26), 7_820);
  near(distanceKm(HOME, SF), 11_940);
  assert.equal(distanceKm(HOME, HOME), 0);
});

test('distances read to the nearest 10 km with a thousands separator', () => {
  assert.equal(formatKm(16_993.4), '16,990');
  assert.equal(formatKm(7_825), '7,830');
  assert.equal(formatKm(4), '0');
});

test('the board reads newest year first and keeps the given order within a year', () => {
  assert.deepEqual(newestFirst([TOKYO_19, LONDON, HOBART, PARIS, TOKYO_26]).map((x) => `${x.city} ${x.year}`), [
    'Hobart 2026', 'Tokyo 2026', 'London 2024', 'Paris 2024', 'Tokyo 2019',
  ]);
});

test('a city visited twice is one place, at its latest visit; the match ignores case and spacing', () => {
  const again = { ...TOKYO_19, city: ' tokyo ' };
  assert.deepEqual(places([again, TOKYO_26, LONDON]).map((x) => `${x.city} ${x.year}`), ['Tokyo 2026', 'London 2024']);
});

test('the summary counts countries, cities and continents once each and fills the empty years', () => {
  const sum = summarize([TOKYO_19, TOKYO_26, LONDON, PARIS, SF, HOBART]);
  assert.deepEqual(sum.countries, ['JP', 'AU', 'GB', 'FR', 'US']);
  assert.equal(sum.cities, 5);
  assert.deepEqual(sum.byContinent, [
    { continent: 'EU', countries: 2 },
    { continent: 'AS', countries: 1 },
    { continent: 'NA', countries: 1 },
    { continent: 'OC', countries: 1 },
  ]);
  assert.equal(sum.since, 2018);
  assert.deepEqual(sum.perYear.map((y) => y.stops), [1, 1, 0, 0, 0, 0, 2, 0, 2]);
  assert.equal(sum.farthest?.stop.city, 'London');
});

test('an empty list summarises to nothing rather than throwing', () => {
  const sum = summarize([]);
  assert.equal(sum.cities, 0);
  assert.equal(sum.since, null);
  assert.deepEqual(sum.perYear, []);
  assert.equal(sum.farthest, null);
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
  const tokyo = route(HOME, TOKYO_26);
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

test('within a year the later month comes first; a stop with no month comes last; ties keep their order', () => {
  const osaka = { ...TOKYO_26, city: 'Osaka', month: 10 };
  const kyoto = { ...TOKYO_26, city: 'Kyoto', month: 10 };
  const hanoiMar = { ...TOKYO_26, city: 'Hanoi', country: 'VN', month: 3 };
  assert.deepEqual(newestFirst([hanoiMar, HOBART, osaka, kyoto, TOKYO_19]).map((x) => x.city), ['Osaka', 'Kyoto', 'Hanoi', 'Hobart', 'Tokyo']);
});

test('a stop reads as month and year when the month is known', () => {
  assert.equal(when({ year: 2026, month: 10 }), 'OCT 2026');
  assert.equal(when({ year: 2017, month: 1 }), 'JAN 2017');
  assert.equal(when({ year: 2019 }), '2019');
});

test('stored stops are checked at the door: bad ones are dropped, good ones normalised', () => {
  const good = { city: ' Hanoi ', country: 'vn', year: 2025, month: 11, lat: 21.0285, lon: 105.8542, _id: 'x', basis: 'not shown' };
  assert.deepEqual(parseStops([good]), [{ city: 'Hanoi', country: 'VN', year: 2025, month: 11, lat: 21.0285, lon: 105.8542 }]);
  assert.deepEqual(parseStops([{ ...good, month: undefined }])[0], { city: 'Hanoi', country: 'VN', year: 2025, lat: 21.0285, lon: 105.8542 });
  for (const bad of [
    { ...good, city: '' },
    { ...good, country: 'UK' }, // not ISO alpha-2: the map would not know it
    { ...good, year: 25 },
    { ...good, year: 2025.5 },
    { ...good, month: 13 },
    { ...good, month: 0 },
    { ...good, lat: 91 },
    { ...good, lon: '105' },
    null,
    'Hanoi',
  ]) assert.deepEqual(parseStops([bad]), [], JSON.stringify(bad));
  assert.deepEqual(parseStops(undefined), []);
  assert.deepEqual(parseStops({ city: 'Hanoi' }), []);
});
