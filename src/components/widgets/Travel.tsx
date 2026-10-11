import type { TravelStop } from "@/types/travel";
import { GRID } from "@/lib/worldMap";
import { CONTINENT_NAMES, HOME, countryOf, distanceKm, formatKm, landPaths, newestFirst, places, project, route, summarize } from "@/utils/travel";

const NO_ITEMS = <p className="font-mono text-dense text-ink-3">No items</p>;

// One grid unit is one dot. Round caps on zero-length dashes draw the dots (see landPaths).
const DOTS = { fill: "none", strokeWidth: 0.62, strokeLinecap: "round", strokeDasharray: "0 1", strokeDashoffset: -0.5 } as const;

/**
 * The dot map: land in --rule-strong, visited countries in the accent, a great-circle line from
 * Sydney to every city (drawn once on load, again on hover), a ring per city, a square for home.
 * Each city's ring carries a native tooltip; the label names the countries, the table the cities.
 */
function WorldMap({ stops }: { stops: TravelStop[] }) {
  const sum = summarize(stops);
  const { lit, rest } = landPaths(sum.countries);
  const home = project(HOME.lat, HOME.lon);
  const newest = sum.perYear.at(-1)?.year;
  const pins = places(stops);
  return (
    <svg
      viewBox={`0 0 ${GRID.cols} ${GRID.rows}`}
      className="w-full h-auto block"
      role="img"
      aria-label={`World map of the ${sum.countries.length} countries visited: ${sum.countries.map((c) => countryOf(c).name).join(", ")}; a line runs from Sydney to each of ${sum.cities} cities`}
    >
      <path d={rest} stroke="var(--rule-strong)" {...DOTS} />
      <path d={lit} stroke="var(--accent)" {...DOTS} />
      <g fill="none" stroke="var(--accent)" strokeWidth={0.25} strokeOpacity={0.55}>
        {pins.map((s, i) => {
          // A Pacific crossing runs off one edge; its copy, moved by `shift`, comes in at the other in step.
          const { d, shift } = route(HOME, s);
          const style = { animationDelay: `${80 + i * 30}ms` };
          return (
            <g key={`${s.city}|${s.country}`}>
              <path d={d} pathLength={1} className="draw" style={style} />
              {shift !== 0 && <path d={d} pathLength={1} className="draw" style={style} transform={`translate(${shift} 0)`} />}
            </g>
          );
        })}
      </g>
      {/* Oldest first, so a city from the latest year is never covered by an older one beside it */}
      {[...pins].reverse().map((s) => {
        const p = project(s.lat, s.lon);
        const latest = s.year === newest;
        return (
          <circle key={`${s.city}|${s.country}`} cx={p.x} cy={p.y} r={0.9} fill={latest ? "var(--accent)" : "var(--surface)"} stroke={latest ? "var(--surface)" : "var(--ink)"} strokeWidth={0.32}>
            <title>{`${s.city}, ${countryOf(s.country).name} · ${s.year} · ${formatKm(distanceKm(HOME, s))} km from Sydney`}</title>
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

/** The departures board: city, country, year, distance from Sydney, newest first. */
function Board({ stops, caption, names = false }: { stops: TravelStop[]; caption: string; names?: boolean }) {
  return (
    <table className="w-full font-mono text-dense">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="stamp text-ink-3 text-left">
          <th scope="col" className="font-normal pb-1.5">City</th>
          <th scope="col" className="font-normal pb-1.5 pl-3">
            {names ? (
              <>
                <span className="md:hidden">Ctry</span>
                <span className="hidden md:inline">Country</span>
              </>
            ) : (
              "Ctry"
            )}
          </th>
          <th scope="col" className="font-normal pb-1.5 pl-3">Year</th>
          <th scope="col" className="font-normal pb-1.5 pl-3 text-right whitespace-nowrap">From SYD</th>
        </tr>
      </thead>
      <tbody className="border-t border-rule">
        {stops.map((s, i) => {
          const { name } = countryOf(s.country);
          return (
            <tr key={`${s.city}|${s.country}|${s.year}|${i}`} className="border-b border-rule last:border-b-0">
              {/* The city takes the slack and wraps rather than hiding a long name; the other columns size to their content. */}
              <td className="h-8 py-1 w-full break-words uppercase text-ink">{s.city}</td>
              <td className="pl-3 text-ink-2 whitespace-nowrap">
                {names ? (
                  <>
                    <span className="md:hidden" title={name}>{s.country.toUpperCase()}</span>
                    <span className="hidden md:inline">{name}</span>
                  </>
                ) : (
                  <span title={name}>{s.country.toUpperCase()}</span>
                )}
              </td>
              <td className="pl-3 text-ink-2">{s.year}</td>
              <td className="pl-3 text-right text-ink-2 whitespace-nowrap">{formatKm(distanceKm(HOME, s))} KM</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Card body: the dot map, the country count, the five latest stops. The count is set at the dateline size,
 * not the numeral: the live temperature stays the biggest number on the page (DESIGN-DIRECTION graft 1).
 */
export function TravelCard({ stops }: { stops: TravelStop[] }) {
  if (!stops.length) return NO_ITEMS;
  const sum = summarize(stops);
  return (
    <div className="grid grow gap-5 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6">
      <div className="lg:col-start-8 lg:col-span-5">
        <p className="flex items-baseline gap-3">
          <span className="font-display font-medium text-ink text-dateline">{sum.countries.length}</span>
          <span className="text-item text-ink-2">countries</span>
        </p>
        <p className="mt-2 font-mono text-source text-ink-3 uppercase">
          {sum.cities} cities · {sum.continents.length} continents · since {sum.since}
        </p>
      </div>
      <figure className="lg:col-start-1 lg:col-span-7 lg:row-start-1 lg:row-span-2 flex flex-col justify-center">
        <WorldMap stops={stops} />
        <Legend />
      </figure>
      <div className="lg:col-start-8 lg:col-span-5 lg:row-start-2">
        <Board stops={newestFirst(stops).slice(0, 5)} caption="The five latest stops" />
      </div>
    </div>
  );
}

/** Dialog body: the map again, the counts, stops per year, countries per continent, and every stop. */
export function TravelFull({ stops }: { stops: TravelStop[] }) {
  if (!stops.length) return NO_ITEMS;
  const sum = summarize(stops);
  const most = Math.max(...sum.perYear.map((y) => y.stops), 1);
  const widest = Math.max(...sum.byContinent.map((c) => c.countries), 1);
  // The farthest distance is the figure; its city goes on a line of its own, so the number is never cut.
  const stats: Array<[label: string, value: string, under?: string]> = [
    ["Countries", String(sum.countries.length)],
    ["Cities", String(sum.cities)],
    ["Continents", String(sum.continents.length)],
    ["Farthest", sum.farthest ? `${formatKm(sum.farthest.km)} KM` : "—", sum.farthest?.stop.city],
  ];
  return (
    <div>
      <WorldMap stops={stops} />
      <Legend />

      <dl className="raster grid-cols-2 md:grid-cols-4 mt-6">
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

      <p className="stamp text-ink-3 mt-6">Stops per year</p>
      <svg viewBox={`0 0 ${sum.perYear.length * 4} 24`} preserveAspectRatio="none" className="w-full block h-12 mt-2" aria-hidden>
        {sum.perYear.map((y, i) => (
          <rect
            key={y.year}
            x={i * 4 + 0.6}
            y={24 - (y.stops / most) * 22}
            width={2.8}
            height={(y.stops / most) * 22}
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
      <p className="sr-only">{sum.perYear.map((y) => `${y.year}: ${y.stops} ${y.stops === 1 ? "stop" : "stops"}`).join("; ")}.</p>

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

      <p className="stamp text-ink-3 mt-6 mb-2">Every stop</p>
      <Board stops={newestFirst(stops)} caption="Every stop, newest first" names />

      <p className="font-mono text-source text-ink-3 mt-6">
        Sample data for the mock-up · map: Natural Earth 1:50m on a 2° grid · distances are great-circle from Sydney
      </p>
    </div>
  );
}
