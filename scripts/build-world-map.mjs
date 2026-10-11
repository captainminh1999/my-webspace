// Writes src/lib/worldMap.ts: the dot grid behind the Travel card's map, which
// country each dot belongs to, and every country's name and continent.
//
// The map is data, not a picture: a 2° equirectangular grid, 180 columns from
// 180°W and 70 rows from 84°N (Antarctica is left off), sampled once from
// Natural Earth's 1:50m countries. A country too small to own a cell centre
// (Singapore, Hong Kong, Malta, most islands) gets the free cell nearest its
// middle — never the last cell of another country — so a visit anywhere lights
// at least one dot; the script fails if any country is left without one.
//
// The packages it reads are not dependencies of the site. To rebuild:
//   npm i --no-save world-atlas@2.0.2 topojson-client@3.1.0 d3-geo@3.1.1 i18n-iso-countries@7 countries-list@3
//   node scripts/build-world-map.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoBounds, geoCentroid, geoContains } from "d3-geo";
import iso from "i18n-iso-countries";
import { countries as LIST } from "countries-list";

const require = createRequire(import.meta.url);
const OUT = new URL("../src/lib/worldMap.ts", import.meta.url);

const STEP = 2;
const WEST = -180;
const NORTH = 84;
const COLS = 360 / STEP;
const ROWS = (NORTH + 56) / STEP; // 84°N to 56°S

const topo = JSON.parse(readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const features = feature(topo, topo.objects.countries).features;

// Territories with an ISO code of their own that Natural Earth draws as part of another
// country: a Paris stop must not light French Guiana. [code, west, south, east, north],
// tested against each polygon's centroid.
const OVERSEAS = {
  FR: [["GF", -55, 2, -51, 6], ["GP", -62, 15.8, -60.9, 16.6], ["MQ", -61.3, 14.3, -60.7, 14.95], ["RE", 55, -21.5, 56, -20.8], ["YT", 44.9, -13.1, 45.4, -12.5]],
  NL: [["BQ", -69, 11.9, -62.8, 17.8]],
  NZ: [["TK", -173, -10, -171, -8]],
  NO: [["SJ", 5, 74, 35, 81.5], ["SJ", -10, 70.5, -7, 71.5]],
};

/** One shape per code: a listed country's overseas polygons become shapes of their own. */
function split(f, code) {
  const boxes = OVERSEAS[code];
  if (!boxes || f.geometry.type !== "MultiPolygon") return [{ code, geometry: f.geometry }];
  const groups = new Map();
  for (const polygon of f.geometry.coordinates) {
    const [lon, lat] = geoCentroid({ type: "Polygon", coordinates: polygon });
    const box = boxes.find(([, w, s, e, n]) => lon >= w && lon <= e && lat >= s && lat <= n);
    const k = box ? box[0] : code;
    groups.set(k, [...(groups.get(k) ?? []), polygon]);
  }
  return [...groups].map(([k, coordinates]) => ({ code: k, geometry: { type: "MultiPolygon", coordinates } }));
}

// Natural Earth marks a few places with no ISO code (Kosovo, Northern Cyprus, Somaliland):
// they stay on the map, but no visit can light them.
const shapes = features.flatMap((f) => split(f, f.id ? iso.numericToAlpha2(f.id) ?? "" : "")).map(({ code, geometry }) => {
  const [[w, s], [e, n]] = geoBounds(geometry);
  return { code, f: geometry, w, s, e, n };
});

const lonOf = (c) => WEST + (c + 0.5) * STEP;
const latOf = (r) => NORTH - (r + 0.5) * STEP;
const inBox = (sh, lon, lat) => lat >= sh.s && lat <= sh.n && (sh.w <= sh.e ? lon >= sh.w && lon <= sh.e : lon >= sh.w || lon <= sh.e);

/** grid[r][c]: null for sea, else the owning country's code ("" when it has none). */
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
/** Cells per code. */
const cells = new Map();
const own = (r, c, code) => {
  const was = grid[r][c];
  if (was !== null) cells.set(was, cells.get(was) - 1);
  grid[r][c] = code;
  cells.set(code, (cells.get(code) ?? 0) + 1);
};
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const p = [lonOf(c), latOf(r)];
    const sh = shapes.find((s) => inBox(s, p[0], p[1]) && geoContains(s.f, p));
    if (sh) own(r, c, sh.code);
  }
}

// The small ones, in a fixed order so the output is stable. Each takes the cell nearest its centroid
// that is sea, unclaimed land, or land whose owner keeps another cell — and was not given to another small one.
const given = new Set();
const small = [...new Set(shapes.map((s) => s.code))].filter((code) => code && code !== "AQ" && !cells.get(code)).sort();
for (const code of small) {
  const geometry = { type: "GeometryCollection", geometries: shapes.filter((s) => s.code === code).map((s) => s.f) };
  const [lon, lat] = geoCentroid(geometry);
  const x = (lon - WEST) / STEP - 0.5;
  const y = (NORTH - lat) / STEP - 0.5;
  const free = (r, c) => !given.has(`${r},${c}`) && (grid[r][c] === null || grid[r][c] === "" || cells.get(grid[r][c]) > 1);
  let best = null;
  for (let radius = 0; !best && radius <= 4; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        const r = Math.round(y) + dr;
        const c = (((Math.round(x) + dc) % COLS) + COLS) % COLS;
        if (r < 0 || r >= ROWS || !free(r, c)) continue;
        const d = (r - y) ** 2 + (Math.round(x) + dc - x) ** 2;
        if (!best || d < best.d) best = { r, c, d };
      }
    }
  }
  if (!best) continue; // reported below
  own(best.r, best.c, code);
  given.add(`${best.r},${best.c}`);
}

const missing = [...new Set(shapes.map((s) => s.code))].filter((code) => code && code !== "AQ" && !cells.get(code));
if (missing.length) throw new Error(`No dot for ${missing.join(", ")}`);

/** Horizontal runs of one owner: [row, col, length, code]. */
const runs = [];
for (let r = 0; r < ROWS; r++) {
  let c = 0;
  while (c < COLS) {
    const code = grid[r][c];
    if (code === null) { c++; continue; }
    let end = c + 1;
    while (end < COLS && grid[r][end] === code) end++;
    runs.push([r, c, end - c, code]);
    c = end;
  }
}

const continents = Object.entries(LIST)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, v]) => `${code}:${v.continent}:${v.name}`)
  .join("|");

const body = `// Generated by scripts/build-world-map.mjs — do not edit by hand.
// Natural Earth 1:50m countries (public domain) via world-atlas 2.0.2; names and continents from countries-list.

/** A ${STEP}° equirectangular grid: ${COLS} columns from ${WEST}°, ${ROWS} rows from ${NORTH}°N. */
export const GRID = { step: ${STEP}, west: ${WEST}, north: ${NORTH}, cols: ${COLS}, rows: ${ROWS} } as const;

/** Land as horizontal runs of dots owned by one country: [row, first column, length, ISO alpha-2 ("" for none)]. */
export const RUNS: ReadonlyArray<readonly [number, number, number, string]> = [
${runs.map((r) => `  [${r[0]}, ${r[1]}, ${r[2]}, "${r[3]}"],`).join("\n")}
];

/** "CODE:CONTINENT:Name|…" for every ISO 3166-1 country; continent is AF, AN, AS, EU, NA, OC or SA. */
export const COUNTRIES = ${JSON.stringify(continents)};
`;

writeFileSync(OUT, body);
console.log(`${runs.length} runs, ${grid.flat().filter((v) => v !== null).length} dots, ${[...cells.values()].filter((n) => n > 0).length - (cells.get("") ? 1 : 0)} countries with a dot → ${OUT.pathname}`);
