// The Travel card's arithmetic: the journeys checked on the way in, the board's order, the trips they make,
// the places, the counts and distances. Pure functions; the card draws what they return. The map's geometry
// is in travelMap.ts.
import { COUNTRIES } from "../lib/worldMap.ts";
import type { Journey, Mode, Place } from "../types/travel.ts";

export const HOME = { city: "Sydney", country: "AU", lat: -33.8688, lon: 151.2093 } as const;

export type Continent = "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";

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

/**
 * A journey's distance as the board shows it: great-circle, to the nearest 10 km. Every total adds these
 * figures, so a trip's distance is the sum of its legs' as printed (two 26 km rides are 30 + 30 = 60, not 50).
 */
export const legKm = (j: Pick<Journey, "from" | "to">) => Math.round(distanceKm(j.from, j.to) / 10) * 10;

export const placeKey = (p: Pick<Place, "city" | "country">) => `${p.city.trim().toLowerCase()}|${p.country.toUpperCase()}`;
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
 * The journeys in the order travelled: by year, and within a year by month where it is known. Journeys in
 * the same month keep the order they were stored in (so a trip's journeys in one month go in as travelled),
 * and a journey with no month keeps its place among its year's.
 */
export function chronological(journeys: Journey[]): Journey[] {
  const rows = journeys.map((j, i) => ({ j, i })).sort((a, b) => a.j.year - b.j.year || a.i - b.i);
  for (let start = 0; start < rows.length; ) {
    let end = start;
    while (end < rows.length && rows[end].j.year === rows[start].j.year) end++;
    // Within the year, only the slots holding a month are reordered; a journey without one stays put.
    const slots: number[] = [];
    for (let k = start; k < end; k++) if (rows[k].j.month) slots.push(k);
    const dated = slots.map((k) => rows[k]).sort((a, b) => a.j.month! - b.j.month! || a.i - b.i);
    slots.forEach((k, n) => (rows[k] = dated[n]));
    start = end;
  }
  return rows.map((r) => r.j);
}

/**
 * The journeys as stored (the `journeys` collection in MongoDB, edited by hand), checked at the door.
 * A journey that would draw wrongly or throw — either end with a country code the map does not know or a
 * coordinate off the globe, both ends the same place, a month that is not 1-12 — is dropped rather than
 * shown. `by` is optional, so a value that is not air, land or sea only loses the mode, not the journey.
 * Unknown fields are left behind. They come back in the order travelled (chronological()), so a journey
 * remembered later can be added at the end of the collection.
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
  return chronological(out);
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


export interface TravelSummary {
  /** Distinct ISO codes of the places, in places() order: newest journey first, its destination before its origin. */
  countries: string[];
  cities: number;
  journeys: number;
  since: number | null;
  /** Journeys per year from `since` to the newest year, gaps included as 0. */
  perYear: Array<{ year: number; journeys: number }>;
  /** Every journey's distance as printed (legKm), added up. */
  km: number;
  /** The place farthest from Sydney. */
  farthest: { place: Visited; km: number } | null;
}

export function summarize(journeys: Journey[]): TravelSummary {
  const visited = places(journeys);
  const years = journeys.map((j) => j.year);
  const since = years.length ? Math.min(...years) : null;
  const perYear: TravelSummary["perYear"] = [];
  if (since !== null) for (let y = since; y <= Math.max(...years); y++) perYear.push({ year: y, journeys: years.filter((v) => v === y).length });
  let farthest: TravelSummary["farthest"] = null;
  for (const p of visited) {
    const d = distanceKm(HOME, p);
    if (!farthest || d > farthest.km) farthest = { place: p, km: d };
  }
  return {
    countries: [...new Set(visited.map((p) => p.country))],
    cities: visited.length,
    journeys: journeys.length,
    since,
    perYear,
    km: journeys.reduce((s, j) => s + legKm(j), 0),
    farthest,
  };
}

// ---- Trips: the journeys cut into the outings people remember ----

/** A stay this long or longer between two journeys is living there, not a stop: the trip ends before it. */
export const STAY_MONTHS = 3;

/**
 * Months from one journey's departure to the next one's. A missing month is taken as the one that makes the
 * gap smallest — December for the first journey, January for the next — so a missing month never cuts a trip
 * that might be whole, and a stay it does cut is never longer than it could have been.
 */
export function monthsBetween(a: { year: number; month?: number }, b: { year: number; month?: number }): number {
  return Math.max(0, (b.year - a.year) * 12 + (b.month ?? 1) - (a.month ?? 12));
}

export type TripEnd =
  | "round" // back where it started
  | "home" // reached Sydney, having started somewhere else
  | "stay" // the next journey leaves from here STAY_MONTHS or more later
  | "break" // the next journey leaves from somewhere else (one not recorded in between)
  | "open"; // the latest trip, not back yet

export interface Trip {
  /** The journeys, in the order travelled. */
  legs: Journey[];
  /** legs[0].from, then every leg's `to`. */
  stops: Place[];
  /** The legs' legKm, added up. */
  km: number;
  end: TripEnd;
  /** For end "stay": how long the record rests there (stayAt), and where. */
  stay?: { months: number; place: Place };
}

/**
 * How long the record stays at the place journey `i` arrives at, in months: up to the first journey that
 * leaves it for good. A round trip out of it that comes back without passing home or stopping anywhere for
 * STAY_MONTHS (a weekend at Cat Ba while living in Hanoi) is part of the stay, not the end of it. Null when
 * the chain breaks or the record ends before a journey leaves for good.
 */
export function stayAt(journeys: Journey[], i: number): number | null {
  const here = placeKey(journeys[i].to);
  for (let k = i + 1; k < journeys.length; ) {
    if (placeKey(journeys[k].from) !== here) return null;
    let back = -1;
    for (let m = k; m < journeys.length; m++) {
      const to = placeKey(journeys[m].to);
      if (to === here) {
        back = m;
        break;
      }
      const next = journeys[m + 1];
      if (to === HOME_KEY || !next || placeKey(next.from) !== to || monthsBetween(journeys[m], next) >= STAY_MONTHS) break;
    }
    if (back < 0) return monthsBetween(journeys[i], journeys[k]);
    k = back + 1;
  }
  return null;
}

/**
 * The journeys (in the order travelled) cut into trips. A trip is a chain, each journey leaving from where
 * the last one arrived, and it ends after the journey that
 *   1. arrives back at the trip's first place (a round trip), or
 *   2. arrives home in Sydney, or
 *   3. is the last one (the latest trip, open until the way back is added), or
 *   4. is followed by a journey that leaves from somewhere else (the chain breaks), or
 *   5. arrives where the record then stays STAY_MONTHS or more (stayAt: a place lived in, not a stop).
 * Rule 5 makes years lived somewhere else read as trips from there without storing where that was: a base
 * is simply where the record rests for months, round trips out of it included.
 */
export function trips(journeys: Journey[]): Trip[] {
  const out: Trip[] = [];
  let cur: Journey[] = [];
  const close = (end: TripEnd, stay?: Trip["stay"]) => {
    out.push({ legs: cur, stops: [cur[0].from, ...cur.map((j) => j.to)], km: cur.reduce((s, j) => s + legKm(j), 0), end, ...(stay ? { stay } : {}) });
    cur = [];
  };
  journeys.forEach((j, i) => {
    cur.push(j);
    const here = placeKey(j.to);
    const next = journeys[i + 1];
    if (here === placeKey(cur[0].from)) return close("round");
    if (here === HOME_KEY) return close("home");
    if (!next) return close("open");
    if (placeKey(next.from) !== here) return close("break");
    const stay = stayAt(journeys, i);
    if (stay !== null && stay >= STAY_MONTHS) close("stay", { months: stay, place: j.to });
  });
  return out;
}

/** The trip's first and last month: "OCT 2026", "MAR – APR 2024", "DEC 2026 – JAN 2027", "2019". */
export function span(t: Trip): string {
  const a = t.legs[0];
  const b = t.legs[t.legs.length - 1];
  if (a.year === b.year && a.month === b.month) return when(a);
  if (a.year === b.year && a.month && b.month) return `${MONTHS[a.month - 1]} – ${MONTHS[b.month - 1]} ${a.year}`;
  return `${when(a)} – ${when(b)}`;
}

/** A there-and-back shorter than this from a stop is a side trip: "HANOI (NINH BINH)". */
export const SIDE_KM = 500;

/**
 * The stops as the board reads them: an inner A → B → A with B under SIDE_KM from A is folded into A as a
 * side trip. The trip's own first stop is never folded, so Singapore → Johor Bahru → Singapore stays a trip.
 */
export function itinerary(t: Trip): Array<{ place: Place; side: Place[] }> {
  const s = t.stops;
  const out: Array<{ place: Place; side: Place[] }> = [];
  for (let i = 0; i < s.length; i++) {
    const item = { place: s[i], side: [] as Place[] };
    while (i > 0 && i + 2 < s.length && placeKey(s[i + 2]) === placeKey(s[i]) && distanceKm(s[i], s[i + 1]) < SIDE_KM) {
      item.side.push(s[i + 1]);
      i += 2;
    }
    out.push(item);
  }
  return out;
}

/** Every place once, with the number of trips that stopped there (a trip's start and end included) and the index of the latest. */
export function placeVisits(ts: Trip[]): Array<Place & { trips: number; last: number }> {
  const m = new Map<string, Place & { trips: number; last: number }>();
  ts.forEach((t, i) => {
    const seen = new Set<string>();
    for (const p of t.stops) {
      const k = placeKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      const v = m.get(k) ?? { ...p, trips: 0, last: i };
      v.trips++;
      v.last = i;
      m.set(k, v);
    }
  });
  return [...m.values()];
}

/**
 * The trips on a month rail from January `from` to December `to`: each a bar from its first month to the end
 * of its last, as fractions of the rail, in the first lane where it starts after the last bar there ended
 * (`lanes` to begin with, more when every one is taken), so neighbours never overlap or touch. A trip with a
 * month missing covers its whole years and is `known: false` (drawn hollow).
 */
export function railMarks(ts: Trip[], from: number, to: number, lanes = 2): Array<{ trip: number; left: number; width: number; lane: number; known: boolean }> {
  const total = (to - from + 1) * 12;
  const ends: number[] = Array(lanes).fill(-Infinity);
  return ts.map((t, i) => {
    const a = t.legs[0];
    const b = t.legs[t.legs.length - 1];
    const known = !!(a.month && b.month);
    const start = (a.year - from) * 12 + (known ? a.month! - 1 : 0);
    const end = (b.year - from) * 12 + (known ? b.month! : 12);
    let lane = ends.findIndex((e) => start > e); // a trip in the very next month takes another lane, so the two read as two
    if (lane < 0) lane = ends.push(-Infinity) - 1;
    ends[lane] = end;
    return { trip: i, left: start / total, width: (end - start) / total, lane, known };
  });
}

/** Runs of years with no journey, as [first, last]. */
export function quietYears(perYear: Array<{ year: number; journeys: number }>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start: number | null = null;
  perYear.forEach((y, i) => {
    if (y.journeys === 0 && start === null) start = y.year;
    if (start !== null && (y.journeys !== 0 || i === perYear.length - 1)) {
      out.push([start, y.journeys === 0 ? y.year : y.year - 1]);
      start = null;
    }
  });
  return out;
}
