import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME, countryOf, distanceKm, formatKm, landPaths, newestFirst, places, project, route, summarize } from '../travel.ts';
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
  const count = (d: string) => (d.match(/M/g) ?? []).length;
  assert.equal(count(lit) + count(rest), RUNS.length);
  assert.equal(count(lit), RUNS.filter((r) => r[3] === 'JP' || r[3] === 'SG').length);
  assert.ok(count(lit) > 0);
  assert.equal(landPaths([]).lit, '');
});

test('a route over the Pacific leaves by one edge and comes back at the other; one inside the map is a single line', () => {
  const pacific = route(HOME, SF);
  assert.equal((pacific.match(/M/g) ?? []).length, 2);
  assert.match(pacific, new RegExp(`L${GRID.cols} [\\d.]+M0 [\\d.]+`));
  assert.equal((route(HOME, TOKYO_26).match(/M/g) ?? []).length, 1);
  assert.equal(route(HOME, HOME), '');
});
