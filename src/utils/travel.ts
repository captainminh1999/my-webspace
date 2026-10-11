// The Travel card's arithmetic: distances from Sydney, the counts, the board's
// order, and the map's geometry. Pure functions; the card draws what they return.
import { COUNTRIES, GRID, RUNS } from "../lib/worldMap.ts";
import type { TravelStop } from "../types/travel.ts";

export const HOME = { city: "Sydney", country: "AU", lat: -33.8688, lon: 151.2093 } as const;

export type Continent = "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
export const CONTINENT_NAMES: Record<Continent, string> = {
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  OC: "Oceania",
  SA: "South America",
};

let table: Map<string, { name: string; continent: Continent }> | null = null;

/** Name and continent of an ISO alpha-2 code; an unknown code is its own name and has no continent. */
export function countryOf(code: string): { name: string; continent: Continent | null } {
  if (!table) {
    table = new Map();
    for (const entry of COUNTRIES.split("|")) {
      const [k, continent, name] = entry.split(":");
      table.set(k, { name, continent: continent as Continent });
    }
  }
  return table.get(code.toUpperCase()) ?? { name: code, continent: null };
}

const RAD = Math.PI / 180;
const EARTH_KM = 6371.0088; // mean radius

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "16,990": to the nearest 10 km, which is all a city's centre is good for. */
export const formatKm = (km: number) => (Math.round(km / 10) * 10).toLocaleString("en-AU");

const placeKey = (s: Pick<TravelStop, "city" | "country">) => `${s.city.trim().toLowerCase()}|${s.country.toUpperCase()}`;

/** Newest year first; stops within a year keep the order they were given in. */
export function newestFirst(stops: TravelStop[]): TravelStop[] {
  return stops.map((s, i) => [s, i] as const).sort((a, b) => b[0].year - a[0].year || a[1] - b[1]).map(([s]) => s);
}

/** Each city once, at its most recent visit. */
export function places(stops: TravelStop[]): TravelStop[] {
  const seen = new Set<string>();
  return newestFirst(stops).filter((s) => !seen.has(placeKey(s)) && !!seen.add(placeKey(s)));
}

export interface TravelSummary {
  /** Distinct ISO codes, in the order first met on the newest-first board. */
  countries: string[];
  cities: number;
  continents: Continent[];
  /** Countries per continent, most first. */
  byContinent: Array<{ continent: Continent; countries: number }>;
  since: number | null;
  /** Stops per year from `since` to the newest year, gaps included as 0. */
  perYear: Array<{ year: number; stops: number }>;
  farthest: { stop: TravelStop; km: number } | null;
}

export function summarize(stops: TravelStop[]): TravelSummary {
  const board = newestFirst(stops);
  const countries = [...new Set(board.map((s) => s.country.toUpperCase()))];
  const counts = new Map<Continent, number>();
  for (const c of countries) {
    const { continent } = countryOf(c);
    if (continent) counts.set(continent, (counts.get(continent) ?? 0) + 1);
  }
  const byContinent = [...counts].map(([continent, n]) => ({ continent, countries: n })).sort((a, b) => b.countries - a.countries || a.continent.localeCompare(b.continent));
  const years = board.map((s) => s.year);
  const since = years.length ? Math.min(...years) : null;
  const perYear: TravelSummary["perYear"] = [];
  if (since !== null) for (let y = since; y <= Math.max(...years); y++) perYear.push({ year: y, stops: years.filter((v) => v === y).length });
  let farthest: TravelSummary["farthest"] = null;
  for (const s of board) {
    const km = distanceKm(HOME, s);
    if (!farthest || km > farthest.km) farthest = { stop: s, km };
  }
  return {
    countries,
    cities: places(stops).length,
    continents: byContinent.map((c) => c.continent),
    byContinent,
    since,
    perYear,
    farthest,
  };
}

// ---- Map geometry, in grid units: one unit is one dot, x from 180°W, y from the grid's top edge ----

export function project(lat: number, lon: number): { x: number; y: number } {
  return { x: (lon - GRID.west) / GRID.step, y: (GRID.north - lat) / GRID.step };
}

/**
 * The land as two path strings, one for visited countries and one for the rest. Each run of dots is one
 * horizontal subpath, drawn as a dotted line: `stroke-dasharray: 0 1` with round caps puts a dot at every
 * unit, and `stroke-dashoffset: -0.5` centres them in their cells (a subpath starts its dashes afresh).
 */
export function landPaths(visited: Iterable<string>): { lit: string; rest: string } {
  const on = new Set([...visited].map((c) => c.toUpperCase()));
  const lit: string[] = [];
  const rest: string[] = [];
  for (const [row, col, len, code] of RUNS) (code && on.has(code) ? lit : rest).push(`M${col} ${row + 0.5}h${len}`);
  return { lit: lit.join(""), rest: rest.join("") };
}

// A tenth of a dot is under half a pixel on the widest map.
const n1 = (v: number) => +v.toFixed(1);

/**
 * The great circle from `a` to `b` as one unbroken path. Where it crosses the antimeridian it carries on
 * past the map's edge (x beyond 0 or `GRID.cols`), and `shift` is the translation that brings that part
 * back in at the other edge: draw the path, and when `shift` is not 0 draw it again moved by `shift`.
 * The svg clips both, so Sydney to San Francisco leaves on the right and comes back on the left, and the
 * two copies draw on in step. One point per 4° of arc, at least 2 and at most `maxSteps`.
 */
export function route(a: { lat: number; lon: number }, b: { lat: number; lon: number }, maxSteps = 48): { d: string; shift: number } {
  const v = (p: { lat: number; lon: number }) => [Math.cos(p.lat * RAD) * Math.cos(p.lon * RAD), Math.cos(p.lat * RAD) * Math.sin(p.lon * RAD), Math.sin(p.lat * RAD)];
  const [p, q] = [v(a), v(b)];
  const d = Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
  if (d < 1e-6 || Math.PI - d < 1e-6) return { d: "", shift: 0 }; // the same place, or antipodes (no single great circle)
  const steps = Math.min(maxSteps, Math.max(2, Math.ceil(d / RAD / 4)));
  let out = "";
  let offset = 0;
  let prev: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ka = Math.sin((1 - t) * d) / Math.sin(d);
    const kb = Math.sin(t * d) / Math.sin(d);
    const [x3, y3, z3] = [ka * p[0] + kb * q[0], ka * p[1] + kb * q[1], ka * p[2] + kb * q[2]];
    const { x, y } = project(Math.atan2(z3, Math.hypot(x3, y3)) / RAD, Math.atan2(y3, x3) / RAD);
    if (prev !== null && Math.abs(x - prev) > GRID.cols / 2) offset += x < prev ? GRID.cols : -GRID.cols;
    out += `${i ? "L" : "M"}${n1(x + offset)} ${n1(y)}`;
    prev = x;
  }
  return { d: out, shift: offset ? -offset : 0 };
}
