// The Travel card's arithmetic: the journeys checked on the way in, the board's order, the places and
// routes they make, the counts and distances, and the map's geometry. Pure functions; the card draws
// what they return.
import { COUNTRIES, GRID, RUNS } from "../lib/worldMap.ts";
import type { Journey, Mode, Place } from "../types/travel.ts";

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

const placeKey = (p: Pick<Place, "city" | "country">) => `${p.city.trim().toLowerCase()}|${p.country.toUpperCase()}`;
const HOME_KEY = placeKey(HOME);

/**
 * Newest first by year, then month (one with no month comes last in its year). Within a tie the one
 * stored later comes first: the collection is kept in the order travelled, so a month with four
 * journeys reads back from the last one.
 */
export function newestFirst<T extends { year: number; month?: number }>(items: T[]): T[] {
  return items
    .map((s, i) => [s, i] as const)
    .sort((a, b) => b[0].year - a[0].year || (b[0].month ?? 0) - (a[0].month ?? 0) || b[1] - a[1])
    .map(([s]) => s);
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "OCT 2026", or "2026" when the month is not known. */
export const when = (s: { year: number; month?: number }) => (s.month ? `${MONTHS[s.month - 1]} ${s.year}` : String(s.year));

function parsePlace(v: unknown): Place | null {
  if (!v || typeof v !== "object") return null;
  const { city, country, lat, lon } = v as Record<string, unknown>;
  if (typeof city !== "string" || !city.trim()) return null;
  if (typeof country !== "string" || !countryOf(country).continent) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat as number) > 90 || Math.abs(lon as number) > 180) return null;
  return { city: city.trim(), country: country.toUpperCase(), lat: lat as number, lon: lon as number };
}

const MODES: ReadonlySet<string> = new Set<Mode>(["air", "land", "sea"]);

/**
 * The journeys as stored (the `journeys` collection in MongoDB, edited by hand), checked at the door.
 * A journey that would draw wrongly or throw — either end with a country code the map does not know or a
 * coordinate off the globe, both ends the same place, a month that is not 1-12 — is dropped rather than
 * shown. `by` is optional, so a value that is not air, land or sea only loses the mode, not the journey.
 * Unknown fields are left behind.
 */
export function parseJourneys(docs: unknown): Journey[] {
  if (!Array.isArray(docs)) return [];
  const out: Journey[] = [];
  for (const d of docs as unknown[]) {
    if (!d || typeof d !== "object") continue;
    const { from, to, year, month, by } = d as Record<string, unknown>;
    const a = parsePlace(from);
    const b = parsePlace(to);
    if (!a || !b || placeKey(a) === placeKey(b)) continue;
    if (!Number.isInteger(year) || (year as number) < 1900 || (year as number) > 2100) continue;
    if (month != null && (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12)) continue;
    const mode = typeof by === "string" ? by.trim().toLowerCase() : "";
    out.push({
      from: a,
      to: b,
      year: year as number,
      ...(month != null ? { month: month as number } : {}),
      ...(MODES.has(mode) ? { by: mode as Mode } : {}),
    });
  }
  return out;
}

/** A place with the month of the latest journey that arrived there or left it. */
export type Visited = Place & { year: number; month?: number };

/** Every place a journey starts or ends at, home aside, once each, at its latest journey; newest first. */
export function places(journeys: Journey[]): Visited[] {
  const seen = new Set<string>([HOME_KEY]);
  const out: Visited[] = [];
  for (const j of newestFirst(journeys)) {
    for (const p of [j.to, j.from]) {
      const k = placeKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...p, year: j.year, ...(j.month ? { month: j.month } : {}) });
    }
  }
  return out;
}

/**
 * The lines on the map: each pair of places once, whichever way and however often it was travelled, in
 * the direction of its latest journey and carrying that journey's year. Oldest first, so the newest
 * draws on top.
 */
export function routes(journeys: Journey[]): Array<{ from: Place; to: Place; year: number }> {
  const seen = new Map<string, { from: Place; to: Place; year: number }>();
  for (const j of newestFirst(journeys)) {
    const k = [placeKey(j.from), placeKey(j.to)].sort().join(">");
    if (!seen.has(k)) seen.set(k, { from: j.from, to: j.to, year: j.year });
  }
  return [...seen.values()].reverse();
}

export interface TravelSummary {
  /** Distinct ISO codes of the places, in the order first met on the newest-first board. */
  countries: string[];
  cities: number;
  journeys: number;
  continents: Continent[];
  /** Countries per continent, most first. */
  byContinent: Array<{ continent: Continent; countries: number }>;
  since: number | null;
  /** Journeys per year from `since` to the newest year, gaps included as 0. */
  perYear: Array<{ year: number; journeys: number }>;
  /** Every journey's great-circle distance, added up. */
  km: number;
  longest: { journey: Journey; km: number } | null;
  /** The place farthest from Sydney. */
  farthest: { place: Visited; km: number } | null;
}

export function summarize(journeys: Journey[]): TravelSummary {
  const visited = places(journeys);
  const countries = [...new Set(visited.map((p) => p.country))];
  const counts = new Map<Continent, number>();
  for (const c of countries) {
    const { continent } = countryOf(c);
    if (continent) counts.set(continent, (counts.get(continent) ?? 0) + 1);
  }
  const byContinent = [...counts].map(([continent, n]) => ({ continent, countries: n })).sort((a, b) => b.countries - a.countries || a.continent.localeCompare(b.continent));
  const years = journeys.map((j) => j.year);
  const since = years.length ? Math.min(...years) : null;
  const perYear: TravelSummary["perYear"] = [];
  if (since !== null) for (let y = since; y <= Math.max(...years); y++) perYear.push({ year: y, journeys: years.filter((v) => v === y).length });
  let km = 0;
  let longest: TravelSummary["longest"] = null;
  for (const j of newestFirst(journeys)) {
    const d = distanceKm(j.from, j.to);
    km += d;
    if (!longest || d > longest.km) longest = { journey: j, km: d };
  }
  let farthest: TravelSummary["farthest"] = null;
  for (const p of visited) {
    const d = distanceKm(HOME, p);
    if (!farthest || d > farthest.km) farthest = { place: p, km: d };
  }
  return {
    countries,
    cities: visited.length,
    journeys: journeys.length,
    continents: byContinent.map((c) => c.continent),
    byContinent,
    since,
    perYear,
    km,
    longest,
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
  // Runs that touch on a row and land in the same path are one subpath: the dashes restart at its integer
  // start, so the merged run puts its dots exactly where the two did, in fewer bytes.
  const lit: Array<[number, number, number]> = [];
  const rest: Array<[number, number, number]> = [];
  for (const [row, col, len, code] of RUNS) {
    const runs = code && on.has(code) ? lit : rest;
    const last = runs.at(-1);
    if (last && last[0] === row && last[1] + last[2] === col) last[2] += len;
    else runs.push([row, col, len]);
  }
  const d = (runs: Array<[number, number, number]>) => runs.map(([row, col, len]) => `M${col} ${row + 0.5}h${len}`).join("");
  return { lit: d(lit), rest: d(rest) };
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
