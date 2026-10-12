import type { Journey } from "@/types/travel";
import { GRID } from "@/lib/worldMap";
import { CONTINENT_NAMES, HOME, countryOf, distanceKm, formatKm, landPaths, newestFirst, places, project, route, routes, summarize, when } from "@/utils/travel";

const NO_ITEMS = <p className="font-mono text-dense text-ink-3">No items</p>;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// One grid unit is one dot. Round caps on zero-length dashes draw the dots (see landPaths).
const DOTS = { fill: "none", strokeWidth: 0.62, strokeLinecap: "round", strokeDasharray: "0 1", strokeDashoffset: -0.5 } as const;

const EARTH_AROUND_KM = 40_075; // the equator

/**
 * The dot map: land in --rule-strong, visited countries in the accent, a great-circle line for every
 * pair of places travelled between (drawn once on load in the order travelled, again on hover), a ring
 * per place, a square for home. Each ring carries a native tooltip; the label names the countries, the
 * table the journeys.
 */
function WorldMap({ journeys }: { journeys: Journey[] }) {
  const sum = summarize(journeys);
  const { lit, rest } = landPaths(sum.countries);
  const home = project(HOME.lat, HOME.lon);
  const newest = sum.perYear.at(-1)?.year;
  const lines = routes(journeys);
  return (
    <svg
      viewBox={`0 0 ${GRID.cols} ${GRID.rows}`}
      className="w-full h-auto block"
      role="img"
      aria-label={`World map of the ${sum.countries.length} countries visited: ${sum.countries.map((c) => countryOf(c).name).join(", ")}; lines join the ${sum.cities} cities as they were travelled between`}
    >
      <path d={rest} stroke="var(--rule-strong)" {...DOTS} />
      <path d={lit} stroke="var(--accent)" {...DOTS} />
      <g fill="none" stroke="var(--accent)" strokeWidth={0.25}>
        {lines.map((r, i) => {
          // A Pacific crossing runs off one edge; its copy, moved by `shift`, comes in at the other in step.
          const { d, shift } = route(r.from, r.to);
          const style = { animationDelay: `${80 + i * 30}ms` };
          return (
            <g key={`${r.from.city}|${r.from.country}>${r.to.city}|${r.to.country}`} strokeOpacity={r.year === newest ? 0.9 : 0.45}>
              <path d={d} pathLength={1} className="draw" style={style} />
              {shift !== 0 && <path d={d} pathLength={1} className="draw" style={style} transform={`translate(${shift} 0)`} />}
            </g>
          );
        })}
      </g>
      {/* Oldest first, so a place from the latest year is never covered by an older one beside it */}
      {[...places(journeys)].reverse().map((p) => {
        const at = project(p.lat, p.lon);
        const latest = p.year === newest;
        return (
          <circle key={`${p.city}|${p.country}`} cx={at.x} cy={at.y} r={0.9} fill={latest ? "var(--accent)" : "var(--surface)"} stroke={latest ? "var(--surface)" : "var(--ink)"} strokeWidth={0.32}>
            <title>{`${p.city}, ${countryOf(p.country).name} · latest ${when(p)} · ${formatKm(distanceKm(HOME, p))} km from Sydney`}</title>
          </circle>
        );
      })}
      <rect x={home.x - 0.85} y={home.y - 0.85} width={1.7} height={1.7} fill="var(--ink)">
        <title>Sydney · home</title>
      </rect>
    </svg>
  );
}

function Legend() {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-source text-ink-3 uppercase" aria-hidden>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-1.5 rounded-full bg-accent" /> Visited country
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2 rounded-full border border-ink" /> City
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-accent" /> Latest year
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2 bg-ink" /> Sydney
      </span>
    </p>
  );
}

const MODE_LABEL = { air: "Air", land: "Land", sea: "Sea" } as const;

/**
 * The departures board: from, to, month and year, and the journey's own great-circle distance, newest
 * first. The full board adds each end's country code and how the journey was made.
 */
function Board({ journeys, caption, full = false }: { journeys: Journey[]; caption: string; full?: boolean }) {
  // A city takes the slack and wraps rather than hiding a long name; the other columns size to their content.
  // wrap-anywhere, not break-words: only it lowers the cell's min-content, so one long word cannot push the table wide.
  const place = (p: Journey["from"]) => (
    <>
      {p.city}
      {full && (
        <span className="text-ink-3" title={countryOf(p.country).name}>
          {" "}
          {p.country}
        </span>
      )}
    </>
  );
  return (
    <table className="w-full font-mono text-dense">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="stamp text-ink-3 text-left">
          <th scope="col" className="font-normal pb-1.5 w-1/2">From</th>
          <th scope="col" className="font-normal pb-1.5 pl-3 w-1/2">To</th>
          <th scope="col" className="font-normal pb-1.5 pl-3">When</th>
          {full && <th scope="col" className="font-normal pb-1.5 pl-3">By</th>}
          <th scope="col" className="font-normal pb-1.5 pl-3 text-right">Km</th>
        </tr>
      </thead>
      <tbody className="border-t border-rule">
        {journeys.map((j, i) => (
          <tr key={`${j.from.city}>${j.to.city}|${when(j)}|${i}`} className="border-b border-rule last:border-b-0">
            <td className="h-8 py-1 wrap-anywhere uppercase text-ink">{place(j.from)}</td>
            <td className="py-1 pl-3 wrap-anywhere uppercase text-ink">{place(j.to)}</td>
            <td className="pl-3 text-ink-2 whitespace-nowrap">{when(j)}</td>
            {full && <td className="pl-3 text-ink-2 whitespace-nowrap uppercase">{j.by ? MODE_LABEL[j.by] : "—"}</td>}
            <td className="pl-3 text-right text-ink-2 whitespace-nowrap">{formatKm(distanceKm(j.from, j.to))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Card body: the dot map, the country count, the five latest journeys. The count is set at the dateline size,
 * not the numeral: the live temperature stays the biggest number on the page (DESIGN-DIRECTION graft 1).
 */
export function TravelCard({ journeys }: { journeys: Journey[] }) {
  if (!journeys.length) return NO_ITEMS;
  const sum = summarize(journeys);
  return (
    <div className="grid grow gap-5 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6">
      <div className="lg:col-start-8 lg:col-span-5">
        <p className="flex items-baseline gap-3">
          <span className="font-display font-medium text-ink text-dateline">{sum.countries.length}</span>
          <span className="text-item text-ink-2">{sum.countries.length === 1 ? "country" : "countries"}</span>
        </p>
        <p className="mt-2 font-mono text-source text-ink-3 uppercase">
          {count(sum.cities, "city", "cities")} · {count(sum.journeys, "journey", "journeys")} · since {sum.since}
        </p>
      </div>
      <figure className="lg:col-start-1 lg:col-span-7 lg:row-start-1 lg:row-span-2 flex flex-col justify-center">
        <WorldMap journeys={journeys} />
        <Legend />
      </figure>
      <div className="lg:col-start-8 lg:col-span-5 lg:row-start-2">
        <Board journeys={newestFirst(journeys).slice(0, 5)} caption={journeys.length === 1 ? "The latest journey" : `The ${Math.min(5, journeys.length)} latest journeys`} />
      </div>
    </div>
  );
}

/** Dialog body: the map again, the counts and distances, journeys per year, countries per continent, and every journey. */
export function TravelFull({ journeys }: { journeys: Journey[] }) {
  if (!journeys.length) return NO_ITEMS;
  const sum = summarize(journeys);
  const most = Math.max(...sum.perYear.map((y) => y.journeys), 1);
  const widest = Math.max(...sum.byContinent.map((c) => c.countries), 1);
  const around = sum.km / EARTH_AROUND_KM;
  // A distance is the figure; what it belongs to goes on a line of its own, so the number is never cut.
  const stats: Array<[label: string, value: string, under?: string]> = [
    ["Countries", String(sum.countries.length)],
    ["Cities", String(sum.cities)],
    ["Journeys", String(sum.journeys)],
    ["Travelled", `${formatKm(sum.km)} KM`, around >= 0.1 ? `${around.toFixed(1)}× around the Earth` : undefined],
    ["Longest", sum.longest ? `${formatKm(sum.longest.km)} KM` : "—", sum.longest ? `${sum.longest.journey.from.city} → ${sum.longest.journey.to.city}` : undefined],
    ["Farthest", sum.farthest ? `${formatKm(sum.farthest.km)} KM` : "—", sum.farthest ? `${sum.farthest.place.city}, from Sydney` : undefined],
  ];
  return (
    <div>
      <WorldMap journeys={journeys} />
      <Legend />

      <dl className="raster grid-cols-2 md:grid-cols-3 mt-6">
        {stats.map(([label, value, under]) => (
          <div key={label} className="px-3 py-2.5">
            <dt className="stamp text-ink-3">{label}</dt>
            <dd className="mt-1 font-mono text-item text-ink whitespace-nowrap">
              {value}
              {under && <span className="block text-dense text-ink-2 uppercase break-words whitespace-normal">{under}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className="stamp text-ink-3 mt-6">Journeys per year</p>
      <svg viewBox={`0 0 ${sum.perYear.length * 4} 24`} preserveAspectRatio="none" className="w-full block h-12 mt-2" aria-hidden>
        {sum.perYear.map((y, i) => (
          <rect
            key={y.year}
            x={i * 4 + 0.6}
            y={24 - (y.journeys / most) * 22}
            width={2.8}
            height={(y.journeys / most) * 22}
            fill="var(--accent)"
            fillOpacity={0.75}
            className="pop"
            style={{ transformBox: "fill-box", animationDelay: `${i * 30}ms` }}
          />
        ))}
        <line x1={0} y1={23.75} x2={sum.perYear.length * 4} y2={23.75} stroke="var(--rule-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between font-mono text-source text-ink-3 mt-1" aria-hidden>
        <span>{sum.since}</span>
        <span>{sum.perYear.at(-1)?.year}</span>
      </div>
      <p className="sr-only">{sum.perYear.map((y) => `${y.year}: ${count(y.journeys, "journey", "journeys")}`).join("; ")}.</p>

      <p className="stamp text-ink-3 mt-6">Countries by continent</p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {sum.byContinent.map((c, i) => (
          <li key={c.continent} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 h-8 font-mono text-dense">
            <span className="text-ink-2 truncate">{CONTINENT_NAMES[c.continent]}</span>
            <span className="relative h-0.5 bg-rule rounded-full">
              <span className="absolute inset-y-0 left-0 rounded-full bg-accent grow-x" style={{ width: `${(c.countries / widest) * 100}%`, animationDelay: `${i * 40}ms` }} />
            </span>
            <span className="text-right text-ink">{c.countries}</span>
          </li>
        ))}
      </ul>

      <p className="stamp text-ink-3 mt-6 mb-2">Every journey</p>
      <Board journeys={newestFirst(journeys)} caption="Every journey, newest first" full />

      <p className="font-mono text-source text-ink-3 mt-6">
        From flight, rail and stay bookings · a journey runs from one stay to the next, so a change of planes on the way is not a
        place · map: Natural Earth 1:50m on a 2° grid · distances are great-circle
      </p>
    </div>
  );
}
