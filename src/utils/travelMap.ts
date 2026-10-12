// The Travel map's geometry: a frame fitted to the places travelled (never smaller than Asia-Pacific), the
// dot grid cropped to it, great circles inside it, and the marks and labels laid over it. Pure functions;
// mapModel() hands the card everything it draws.
import { GRID, RUNS } from "../lib/worldMap.ts";
import type { Journey } from "../types/travel.ts";
import { HOME, countryOf, itinerary, placeKey, placeVisits, summarize, type Trip } from "./travel.ts";

export interface Frame {
  west: number;
  east: number;
  south: number;
  north: number;
}

/** The smallest map ever drawn: Sumatra to the Coral Sea, Honshu to Tasmania. */
export const APAC_MIN: Frame = { west: 90, east: 160, south: -44, north: 40 };
const PAD_DEG = 6;

type LatLon = { lat: number; lon: number };

/**
 * The frame: the points' bounding box with longitudes taken on the shortest arc that holds them all (so a
 * Pacific crossing grows the frame east past 180° rather than flipping it to the whole world), padded,
 * grown to at least APAC_MIN, then widened or heightened about its centre to an aspect between `aspectMin`
 * and `aspectMax`, and kept inside the grid's 84°N-56°S unless a point lies further south (there is no land
 * drawn there, but the place and its route still need room). Sydney keeps its own longitude; east may pass 180.
 */
export function fitFrame(points: LatLon[], aspectMin: number, aspectMax: number): Frame {
  const all = [...points, HOME];
  const lons = all.map((p) => p.lon).sort((a, b) => a - b);
  let gi = lons.length - 1;
  let gap = lons[0] + 360 - lons[lons.length - 1];
  for (let i = 0; i < lons.length - 1; i++) {
    if (lons[i + 1] - lons[i] > gap) {
      gap = lons[i + 1] - lons[i];
      gi = i;
    }
  }
  let west = lons[(gi + 1) % lons.length];
  let east = lons[gi];
  if (east < west) east += 360;
  if (HOME.lon < west) {
    west -= 360;
    east -= 360;
  }
  const lats = all.map((p) => p.lat);
  west = Math.min(west - PAD_DEG, APAC_MIN.west);
  east = Math.max(east + PAD_DEG, APAC_MIN.east);
  let south = Math.min(Math.min(...lats) - PAD_DEG, APAC_MIN.south);
  let north = Math.max(Math.max(...lats) + PAD_DEG, APAC_MIN.north);
  if (east - west > 360) {
    west = HOME.lon - 180;
    east = HOME.lon + 180;
  }
  const w = east - west;
  const h = north - south;
  const aspect = Math.min(aspectMax, Math.max(aspectMin, w / h));
  if (w / h < aspect) {
    const d = h * aspect - w;
    west -= d / 2;
    east += d / 2;
  } else if (w / h > aspect) {
    const d = Math.min(140, w / aspect) - h;
    south -= d / 2;
    north += d / 2;
  }
  const floor = Math.min(-56, Math.min(...lats) - PAD_DEG);
  if (north > 84) {
    south -= north - 84;
    north = 84;
  }
  if (south < floor) {
    north = Math.min(84, north + (floor - south));
    south = floor;
  }
  return { west, east, south, north };
}

export type Cells = { x0: number; x1: number; y0: number; y1: number; w: number; h: number };

/** The frame in whole grid cells: x from the grid's west edge (it may run past the grid's last column), y from its top (it may run past the last row). */
export function cells(f: Frame): Cells {
  const x0 = Math.floor((f.west - GRID.west) / GRID.step);
  const x1 = Math.ceil((f.east - GRID.west) / GRID.step);
  const y0 = Math.max(0, Math.floor((GRID.north - f.north) / GRID.step));
  const y1 = Math.ceil((GRID.north - f.south) / GRID.step);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}

/** A point in frame units (0..w, 0..h), its longitude unwrapped into the frame. */
export function at(p: LatLon, c: Cells): { x: number; y: number } {
  let x = (p.lon - GRID.west) / GRID.step - c.x0;
  while (x < 0) x += GRID.cols;
  while (x > c.w) x -= GRID.cols;
  return { x, y: (GRID.north - p.lat) / GRID.step - c.y0 };
}

/**
 * The land inside the frame as one path per tier, each run of dots a horizontal subpath drawn as a dotted
 * line: `stroke-dasharray: 0 1` with round caps puts a dot at every unit, and `stroke-dashoffset: -0.5`
 * centres them in their cells (a subpath starts its dashes afresh). Only runs inside the frame are written,
 * relative to its corner; the grid repeats a world to either side, so a frame past 180° still has land.
 * Runs that touch on a row and fall in the same tier are one subpath: the same dots in fewer bytes.
 */
export function cropLand(c: Cells, tierOf: (iso: string) => number, tiers: number): string[] {
  const out: Array<Array<[number, number, number]>> = Array.from({ length: tiers }, () => []);
  for (const k of [-1, 0, 1]) {
    for (const [row, col, len, iso] of RUNS) {
      if (row < c.y0 || row >= c.y1) continue;
      const a = Math.max(col + k * GRID.cols, c.x0);
      const b = Math.min(col + k * GRID.cols + len, c.x1);
      if (b <= a) continue;
      out[tierOf(iso)].push([row - c.y0, a - c.x0, b - a]);
    }
  }
  return out.map((runs) => {
    runs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const merged: Array<[number, number, number]> = [];
    for (const r of runs) {
      const last = merged.at(-1);
      if (last && last[0] === r[0] && last[1] + last[2] === r[1]) last[2] += r[2];
      else merged.push([...r]);
    }
    return merged.map(([y, x, n]) => `M${x} ${y + 0.5}h${n}`).join("");
  });
}

const RAD = Math.PI / 180;
const vec = (p: LatLon) => [Math.cos(p.lat * RAD) * Math.cos(p.lon * RAD), Math.cos(p.lat * RAD) * Math.sin(p.lon * RAD), Math.sin(p.lat * RAD)];

/** The great circle a → b as points at fractions 0..1 of the way, `steps` + 1 of them. */
function slerp(a: LatLon, b: LatLon, steps: (arcDeg: number) => number): LatLon[] {
  const [p, q] = [vec(a), vec(b)];
  const d = Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
  if (d < 1e-6 || Math.PI - d < 1e-6) return []; // the same place, or antipodes (no single great circle)
  const n = steps(d / RAD);
  const out: LatLon[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ka = Math.sin((1 - t) * d) / Math.sin(d);
    const kb = Math.sin(t * d) / Math.sin(d);
    const [x, y, z] = [ka * p[0] + kb * q[0], ka * p[1] + kb * q[1], ka * p[2] + kb * q[2]];
    out.push({ lat: Math.atan2(z, Math.hypot(x, y)) / RAD, lon: Math.atan2(y, x) / RAD });
  }
  return out;
}

/** Points along the great circle a → b about every 8° of arc: the frame takes them in, so no route leaves the map. */
export const arcPoints = (a: LatLon, b: LatLon) => slerp(a, b, (deg) => Math.max(1, Math.ceil(deg / 8)));

// A tenth of a cell is under half a pixel on the widest map.
const n1 = (v: number) => +v.toFixed(1);

/**
 * The great circle a → b in frame units, one point per 2° (2 to 64), each placed in the frame as the places
 * are (at()), so it starts and ends at their marks. A frame past 180° holds a Pacific crossing whole; where a
 * route crosses the frame's own seam, or a pole, it starts a new subpath at the other side instead of a line
 * across the map.
 */
export function arc(a: LatLon, b: LatLon, c: Cells): string {
  const pts = slerp(a, b, (deg) => Math.min(64, Math.max(2, Math.ceil(deg / 2))));
  let out = "";
  let px = 0;
  pts.forEach((p, i) => {
    const { x, y } = at(p, c);
    out += `${i && Math.abs(x - px) < c.w / 2 ? "L" : "M"}${n1(x)} ${n1(y)}`;
    px = x;
  });
  return out;
}

// ---- Labels: HTML over the svg at a fixed px size, placed once on the server for a range of rendered widths ----

export type Anchor = "E" | "W" | "NE" | "SE" | "NW" | "SW" | "N" | "S";
const GAP = 7; // px from the mark's centre to the label box
const OFFSET: Record<Anchor, (w: number, h: number) => [number, number]> = {
  E: (w, h) => [GAP, -h / 2],
  W: (w, h) => [-GAP - w, -h / 2],
  NE: (w, h) => [GAP - 3, -GAP + 2 - h],
  SE: () => [GAP - 3, GAP - 2],
  NW: (w, h) => [-GAP + 3 - w, -GAP + 2 - h],
  SW: (w) => [-GAP + 3 - w, GAP - 2],
  N: (w, h) => [-w / 2, -GAP - h],
  S: (w) => [-w / 2, GAP],
};
/** The CSS that puts a label, positioned at its mark, on the anchor the placer chose: the same offsets as OFFSET. */
export const LABEL_TRANSFORM: Record<Anchor, string> = {
  E: `translate(${GAP}px,-50%)`,
  W: `translate(calc(-100% - ${GAP}px),-50%)`,
  NE: `translate(${GAP - 3}px,calc(-100% - ${GAP - 2}px))`,
  SE: `translate(${GAP - 3}px,${GAP - 2}px)`,
  NW: `translate(calc(-100% - ${GAP - 3}px),calc(-100% - ${GAP - 2}px))`,
  SW: `translate(calc(-100% - ${GAP - 3}px),${GAP - 2}px)`,
  N: `translate(-50%,calc(-100% - ${GAP}px))`,
  S: `translate(-50%,${GAP}px)`,
};
/** An 11px Plex Mono label with 0.04em tracking: 0.6em advance + tracking = 7.04px a character, plus 2 × 3px padding. */
const labelWidth = (s: string) => s.length * 7.04 + 6;
const LABEL_H = 14;

type Box = { l: number; t: number; r: number; b: number };
const overlaps = (p: Box, q: Box) => p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b;
const distance = (p: Box, x: number, y: number) => Math.hypot(Math.max(p.l - x, 0, x - p.r), Math.max(p.t - y, 0, y - p.b));

export interface Mark {
  /** Frame units. */
  x: number;
  y: number;
  /** Diameter in px. */
  size: number;
}

/**
 * Greedy placement in priority order: each label takes the first anchor whose box, at every width from
 * `minW` to `maxW` (sampled every 10px: the marks spread as the map widens, the boxes do not), stays inside
 * the map, clear of every other mark and every label already placed, and clearly nearer its own mark than any
 * other, by 8px at least (so a label is never read as another place's). `texts` is the label and its shorter fallbacks. A label
 * with no such anchor is left off; its mark keeps its tooltip, and the board names the place.
 */
export function placeLabels(marks: Mark[], wants: Array<{ mark: number; texts: string[] }>, frame: { w: number; h: number }, minW: number, maxW: number) {
  const widths: number[] = [];
  for (let W = minW; W < maxW; W += 10) widths.push(W);
  widths.push(maxW);
  const placed: Array<{ mark: number; text: string; anchor: Anchor; w: number }> = [];
  const box = (W: number, m: Mark, a: Anchor, w: number): Box => {
    const s = W / frame.w;
    const [dx, dy] = OFFSET[a](w, LABEL_H);
    return { l: m.x * s + dx, t: m.y * s + dy, r: m.x * s + dx + w, b: m.y * s + dy + LABEL_H };
  };
  const fits = (want: { mark: number }, a: Anchor, w: number) =>
    widths.every((W) => {
      const s = W / frame.w;
      const H = frame.h * s;
      const me = box(W, marks[want.mark], a, w);
      if (me.l < 2 || me.t < 2 || me.r > W - 2 || me.b > H - 2) return false;
      const own = distance(me, marks[want.mark].x * s, marks[want.mark].y * s);
      for (const [i, o] of marks.entries()) {
        if (i === want.mark) continue;
        const r = o.size / 2 + 2;
        const ox = o.x * s;
        const oy = o.y * s;
        if (overlaps(me, { l: ox - r, t: oy - r, r: ox + r, b: oy + r })) return false;
        if (distance(me, ox, oy) < own + 8) return false;
      }
      return placed.every((p) => !overlaps(me, box(W, marks[p.mark], p.anchor, p.w)));
    });
  const ANCHORS: Anchor[] = ["E", "W", "NE", "SE", "NW", "SW", "N", "S"];
  for (const want of wants) {
    for (const text of want.texts) {
      const w = labelWidth(text);
      const anchor = ANCHORS.find((a) => fits(want, a, w));
      if (anchor) {
        placed.push({ mark: want.mark, text, anchor, w });
        break;
      }
    }
  }
  return placed.map(({ mark, text, anchor }) => ({ mark, text, anchor }));
}

/** Points nearer than `px` to each other at the width `minW` share one mark (single linkage). */
function cluster<T extends { x: number; y: number }>(pts: T[], px: number, frameW: number, minW: number): T[][] {
  const s = minW / frameW;
  const parent = pts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (Math.hypot((pts[i].x - pts[j].x) * s, (pts[i].y - pts[j].y) * s) < px) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, T[]>();
  pts.forEach((p, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), p]));
  return [...groups.values()];
}

// ---- The whole map, as data ----

export type MarkKind = "now" | "home" | "was";

/**
 * The map widths at which a map switches to its next set of labels, by container query (globals.css,
 * `.tmap-from-*` / `.tmap-to-*`). A layer's range must start at the narrowest width or at one of these, and
 * end just before one of them or at the widest.
 */
export const LABEL_BREAKS = [296, 560] as const;
/** The narrowest map drawn: the dialog's on a 320px phone (the card's is 254px there). */
export const NARROWEST = 240;

export interface MapModel {
  /** viewBox width and height, in grid cells. */
  w: number;
  h: number;
  /** Land dots: the rest, the visited countries, the latest trip's countries. */
  land: { rest: string; visited: string; latest: string };
  /** Route widths in frame units: px at the width the map is drawn for. */
  stroke: { earlier: number; latest: number; dot: number; dotGap: number };
  /** Each pair of places the earlier trips joined, once, oldest first; `opacity` fades with age. */
  earlier: Array<{ key: string; d: string; land: boolean; opacity: number }>;
  /** The latest trip, leg by leg, in the order travelled. */
  latest: Array<{ key: string; d: string; land: boolean }>;
  /** One set of marks and labels per range of rendered widths. */
  layers: Array<{ minW: number; maxW: number; marks: Array<{ key: string; left: number; top: number; kind: MarkKind; title: string }>; labels: Array<{ key: string; left: number; top: number; kind: MarkKind; text: string; anchor: Anchor }> }>;
  /** What the map shows, in words, for its role="img". */
  label: string;
}

const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Earlier routes fade with the years since they were last travelled. */
function ageOpacity(years: number): number {
  if (years <= 1) return 0.85;
  if (years <= 3) return 0.7;
  if (years <= 6) return 0.5;
  return 0.36;
}

/**
 * Everything the map draws, for trips `ts` (from trips(journeys)). `aspect` bounds the frame's shape, `drawnAt`
 * is the width in px the strokes are sized for, and `layers` the ranges of rendered widths that get their own
 * marks and labels (the dialog's map switches layer with a container query).
 */
export function mapModel(journeys: Journey[], ts: Trip[], opts: { aspect: [number, number]; drawnAt: number; layers: Array<[number, number]> }): MapModel {
  const latest = ts[ts.length - 1];
  const sum = summarize(journeys);
  const homeKey = placeKey(HOME);
  const visits = placeVisits(ts).filter((p) => placeKey(p) !== homeKey);
  const frame = fitFrame([...visits, ...journeys.flatMap((j) => arcPoints(j.from, j.to))], opts.aspect[0], opts.aspect[1]);
  const c = cells(frame);

  // Countries: the latest trip's own (Australia only if it stopped somewhere there but Sydney), then the rest visited.
  const latestCountries = new Set(latest.stops.filter((p) => placeKey(p) !== homeKey).map((p) => p.country));
  const visited = new Set(sum.countries);
  const [rest, seen, now] = cropLand(c, (iso) => (latestCountries.has(iso) ? 2 : visited.has(iso) ? 1 : 0), 3);

  // Routes: each pair of places the earlier trips joined, once, in the mode and year of its last journey (the
  // latest trip's own pairs are left to it); then the latest trip leg by leg.
  const pair = (j: Journey) => [placeKey(j.from), placeKey(j.to)].sort().join(">");
  const mine = new Set(latest.legs.map(pair));
  const newestYear = sum.perYear.at(-1)?.year ?? latest.legs[0].year;
  const earlier = new Map<string, Journey>();
  for (const t of ts.slice(0, -1)) {
    for (const j of t.legs) {
      if (mine.has(pair(j))) continue;
      earlier.delete(pair(j)); // re-inserted at the end: the order is by last use, oldest first
      earlier.set(pair(j), j);
    }
  }
  const u = (px: number) => +((px * c.w) / opts.drawnAt).toFixed(3);

  // Marks: every place, home included; places too close to tell apart at a layer's narrowest width share one.
  const order = new Map<string, number>();
  latest.stops.forEach((p, i) => {
    if (!order.has(placeKey(p))) order.set(placeKey(p), i);
  });
  const pts = [...visits, { ...HOME, trips: 0, last: -1 }].map((p) => ({ ...p, key: placeKey(p), ...at(p, c) }));
  const layers = opts.layers.map(([minW, maxW]) => {
    const groups = cluster(pts, 9, c.w, minW).map((g) => {
      const named = [...g].sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99) || b.trips - a.trips || b.last - a.last);
      const kind: MarkKind = g.some((p) => p.key === homeKey) ? "home" : g.some((p) => order.has(p.key)) ? "now" : "was";
      // A latest-trip mark names only the latest trip's places: another place sharing the mark is in its tooltip.
      const names = (kind === "now" ? named.filter((p) => order.has(p.key)) : named).map((p) => p.city.toUpperCase());
      const texts = names.length > 2 ? [`${names[0]} +${names.length - 1}`] : names.length === 2 ? [names.join(" · "), `${names[0]} +1`] : names;
      return {
        key: named.map((p) => p.key).join("+"),
        x: g.reduce((s, p) => s + p.x, 0) / g.length,
        y: g.reduce((s, p) => s + p.y, 0) / g.length,
        size: kind === "now" ? 9 : 7,
        kind,
        texts,
        title: named.map((p) => (p.key === homeKey ? "Sydney · home" : `${p.city}, ${countryOf(p.country).name} · ${plural(p.trips, "trip", "trips")}`)).join("\n"),
        rank: kind === "now" ? 0 : kind === "home" ? 1 : 2,
        first: Math.min(...g.map((p) => order.get(p.key) ?? 99)),
        trips: Math.max(...g.map((p) => p.trips)),
      };
    });
    const wants = groups
      .map((g, mark) => ({ g, mark }))
      .sort((a, b) => a.g.rank - b.g.rank || a.g.first - b.g.first || b.g.trips - a.g.trips)
      .map(({ g, mark }) => ({ mark, texts: g.texts }));
    const pos = (g: { x: number; y: number }) => ({ left: g.x / c.w, top: g.y / c.h });
    return {
      minW,
      maxW,
      // Earlier places first, so the latest trip's marks and home sit on top.
      marks: [...groups].sort((a, b) => b.rank - a.rank).map((g) => ({ key: g.key, ...pos(g), kind: g.kind, title: g.title })),
      labels: placeLabels(groups, wants, c, minW, maxW).map((l) => ({ key: groups[l.mark].key, ...pos(groups[l.mark]), kind: groups[l.mark].kind, text: l.text, anchor: l.anchor })),
    };
  });

  const ends = [...visits, { ...HOME, trips: 0, last: -1 }].map((p) => ({ p, x: at(p, c).x }));
  const westmost = ends.reduce((a, b) => (b.x < a.x ? b : a)).p;
  const eastmost = ends.reduce((a, b) => (b.x > a.x ? b : a)).p;
  const first = latest.legs[0];
  const route = itinerary(latest)
    .map((s) => s.place.city + (s.side.length ? ` (${s.side.map((p) => p.city).join(", ")})` : ""))
    .join(" → ");
  const label =
    `Map of ${plural(ts.length, "trip", "trips")} to ${plural(sum.cities, "city", "cities")} in ${plural(sum.countries.length, "country", "countries")} since ${sum.since}, ` +
    `from ${westmost.city} in the west to ${eastmost.city} in the east. The latest trip, ${first.month ? `${LONG_MONTHS[first.month - 1]} ` : ""}${first.year}, ${route}, is drawn in front; ` +
    `the earlier trips' routes are drawn faint behind it. Places: ${visits.map((p) => p.city).join(", ")}.`;

  return {
    w: c.w,
    h: c.h,
    land: { rest, visited: seen, latest: now },
    stroke: { earlier: u(1.1), latest: u(2), dot: u(2.2), dotGap: u(4) },
    earlier: [...earlier.entries()].map(([key, j]) => ({ key, d: arc(j.from, j.to, c), land: j.by === "land", opacity: ageOpacity(newestYear - j.year) })),
    latest: latest.legs.map((j, i) => ({ key: `${pair(j)}|${i}`, d: arc(j.from, j.to, c), land: j.by === "land" })),
    layers,
    label,
  };
}

