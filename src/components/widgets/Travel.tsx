import { Fragment, type CSSProperties } from "react";
import type { Journey } from "@/types/travel";
import { HOME, STAY_MONTHS, SIDE_KM, formatKm, itinerary, legKm, placeKey, placeVisits, quietYears, railMarks, span, summarize, trips, when, type Trip, type TravelSummary } from "@/utils/travel";
import { LABEL_BREAKS, LABEL_TRANSFORM, NARROWEST, mapModel, type MapModel } from "@/utils/travelMap";

const NO_ITEMS = <p className="font-mono text-dense text-ink-3">No items</p>;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (v: number) => `${+(v * 100).toFixed(2)}%`;
const EARTH_AROUND_KM = 40_075; // the equator
const MODE_LABEL = { air: "Air", land: "Land", sea: "Sea" } as const;

/**
 * The map: land dots cropped to the region travelled (the latest trip's countries in the accent, the other
 * visited ones in --ink-3), every earlier route once and faint, the latest trip in front leg by leg (drawn on
 * once on load, again on hover), and the places as HTML marks and labels over the svg, so they keep their px
 * size at every width. A map with two label layers switches between them with a container query.
 */
/** Show a set of labels only across its range of map widths (the container queries in globals.css). */
const layerClass = (l: { minW: number; maxW: number }) =>
  [(LABEL_BREAKS as readonly number[]).includes(l.minW) && `tmap-from-${l.minW}`, (LABEL_BREAKS as readonly number[]).includes(l.maxW + 1) && `tmap-to-${l.maxW + 1}`].filter(Boolean).join(" ") || undefined;

function TravelMap({ model }: { model: MapModel }) {
  const style = {
    aspectRatio: `${model.w} / ${model.h}`,
    "--w-earlier": model.stroke.earlier,
    "--w-latest": model.stroke.latest,
    "--w-dot": model.stroke.dot,
    "--dot-gap": model.stroke.dotGap,
  } as CSSProperties;
  return (
    <div className="tmap" role="img" aria-label={model.label} style={style}>
      <svg viewBox={`0 0 ${model.w} ${model.h}`} aria-hidden focusable="false">
        <path className="tmap-dots" d={model.land.rest} stroke="var(--rule-strong)" />
        <path className="tmap-dots" d={model.land.visited} stroke="var(--ink-3)" />
        <path className="tmap-dots" d={model.land.latest} stroke="var(--accent)" />
        <g className="tmap-earlier">
          {model.earlier.map((r, i) =>
            r.land ? (
              <path key={r.key} d={r.d} className="land" strokeOpacity={r.opacity} />
            ) : (
              <path key={r.key} d={r.d} pathLength={1} className="draw" strokeOpacity={r.opacity} style={{ animationDelay: `${80 + i * 20}ms` }} />
            ),
          )}
        </g>
        <g className="tmap-latest">
          {model.latest.map((r, i) =>
            r.land ? <path key={r.key} d={r.d} className="land" /> : <path key={r.key} d={r.d} pathLength={1} className="draw" style={{ animationDelay: `${320 + i * 160}ms` }} />,
          )}
        </g>
      </svg>
      {model.layers.map((layer) => (
        <div key={`${layer.minW}-${layer.maxW}`} className={layerClass(layer)}>
          {layer.marks.map((m) => (
            <i key={m.key} className={`tmap-mk ${m.kind}`} style={{ left: pct(m.left), top: pct(m.top) }} title={m.title} />
          ))}
          {layer.labels.map((l) => (
            <span key={l.key} className={`tmap-lbl ${l.kind}`} style={{ left: pct(l.left), top: pct(l.top), transform: LABEL_TRANSFORM[l.anchor] }}>
              {l.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Legend({ earlier, land }: { earlier: boolean; land: boolean }) {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-source text-ink-3 uppercase" aria-hidden>
      <span className="inline-flex items-center gap-1.5">
        <i className="w-3.5 border-t-[1.75px] border-accent" /> Latest trip
      </span>
      {earlier && (
        <span className="inline-flex items-center gap-1.5">
          <i className="w-3.5 border-t border-ink-3" /> Earlier
        </span>
      )}
      {land && (
        <span className="inline-flex items-center gap-1.5">
          <i className="trip-seg land w-3.5 basis-auto shrink-0" /> By land
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <i className="size-[7px] bg-ink" /> Home
      </span>
    </p>
  );
}

/**
 * A trip's stops in order. The start (and the end of a round trip) are dimmed, a there-and-back side trip is
 * bracketed after the stop it left from, and a line only breaks before an arrow or a bracket unless a name is too
 * long to keep whole.
 */
function Route({ trip, className = "" }: { trip: Trip; className?: string }) {
  const stops = itinerary(trip);
  const round = trip.end === "round";
  return (
    <span className={`uppercase text-ink wrap-anywhere ${className}`}>
      {stops.map((s, i) => {
        const dim = i === 0 || (round && i === stops.length - 1) ? "text-ink-3" : "";
        const side = s.side.map((p) => p.city).join(", ");
        return (
          <Fragment key={`${placeKey(s.place)}|${i}`}>
            {i > 0 && " "}
            <span className={`${dim} ${s.place.city.length > 20 ? "" : "whitespace-nowrap"}`}>
              {i > 0 && "→ "}
              {s.place.city}
            </span>
            {side && <span className={`${dim} ${side.length > 20 ? "" : "whitespace-nowrap"}`}> ({side})</span>}
          </Fragment>
        );
      })}
    </span>
  );
}

/** The trip's legs as one bar, as long as the trip against the longest, each segment as long as its leg. */
function Strip({ trip, longest, latest, delay }: { trip: Trip; longest: number; latest: boolean; delay: number }) {
  return (
    <span className={`trip-strip grow-x mt-2 ${latest ? "latest" : ""}`} style={{ width: pct(trip.km / longest), animationDelay: `${delay}ms` }} aria-hidden>
      {trip.legs.map((j, i) => (
        <i key={i} className={`trip-seg ${j.by ?? "unknown"}`} style={{ flexGrow: legKm(j) }} />
      ))}
    </span>
  );
}

/** How the trip ended, for the dialog: the open latest trip is "so far", a move is "one way". */
function endNote(t: Trip): string {
  if (t.end === "round") return "Round trip";
  if (t.end === "open") return "So far";
  return t.stay ? `One way · then ${t.stay.months} mo in ${t.stay.place.city}` : "One way";
}

/**
 * Card body: the country count and the facts, the map, and the latest trips (four at lg, three below) with
 * each one's legs to scale. The count is set at the dateline size, not the numeral: the live temperature stays
 * the biggest number on the page (DESIGN-DIRECTION graft 1).
 */
export function TravelCard({ journeys }: { journeys: Journey[] }) {
  if (!journeys.length) return NO_ITEMS;
  const ts = trips(journeys);
  const sum = summarize(journeys);
  const model = mapModel(journeys, ts, { aspect: [1.2, 2], drawnAt: 472, layers: [[NARROWEST, 295], [296, 703]] });
  const longest = Math.max(...ts.map((t) => t.km));
  const latest = [...ts].reverse().slice(0, 4);
  return (
    <div className="grid grow gap-5 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-6 lg:grid-cols-[minmax(0,9fr)_minmax(0,14fr)] lg:gap-x-8">
      <div className="md:col-start-2">
        <p className="flex items-baseline gap-3">
          <span className="font-display font-medium text-ink text-dateline">{sum.countries.length}</span>
          <span className="text-item text-ink-2">{sum.countries.length === 1 ? "country" : "countries"}</span>
        </p>
        <p className="mt-2 font-mono text-source text-ink-3 uppercase">
          {count(sum.cities, "city", "cities")} · {count(ts.length, "trip", "trips")} · {count(sum.journeys, "journey", "journeys")} · since {sum.since}
        </p>
      </div>
      <figure className="md:col-start-1 md:row-start-1 md:row-span-2 flex flex-col justify-center">
        <TravelMap model={model} />
        <Legend earlier={ts.length > 1} land={journeys.some((j) => j.by === "land")} />
      </figure>
      <div className="md:col-start-2 md:row-start-2">
        <table className="w-full font-mono text-dense">
          <caption className="sr-only">{latest.length === 1 ? "The latest trip" : "The latest trips, newest first"}: when it set off, its route and its distance</caption>
          <thead>
            <tr className="stamp text-ink-3 text-left">
              <th scope="col" className="font-normal pb-1.5">When</th>
              <th scope="col" className="font-normal pb-1.5 pl-4">Route</th>
              <th scope="col" className="font-normal pb-1.5 pl-4 text-right hidden lg:table-cell">Legs</th>
              <th scope="col" className="font-normal pb-1.5 pl-4 text-right">Km</th>
            </tr>
          </thead>
          <tbody className="border-t border-rule divide-y divide-rule">
            {latest.map((t, i) => {
              const [month, year] = t.legs[0].month ? when(t.legs[0]).split(" ") : ["", String(t.legs[0].year)];
              return (
                <tr key={`${span(t)}|${i}`} className={`align-top ${i === 3 ? "hidden lg:table-row" : ""}`}>
                  <td className="py-2.5 text-ink-2 whitespace-nowrap">
                    <span className="max-lg:block">{month}</span> <span className="max-lg:block">{year}</span>
                  </td>
                  <td className="py-2.5 pl-4 w-full">
                    {/* Two lines at most below lg; the dialog has every stop. */}
                    <Route trip={t} className="block max-lg:line-clamp-2" />
                    <Strip trip={t} longest={longest} latest={i === 0} delay={200 + i * 60} />
                  </td>
                  <td className="py-2.5 pl-4 text-right text-ink-2 hidden lg:table-cell">{t.legs.length}</td>
                  <td className="py-2.5 pl-4 text-right text-ink whitespace-nowrap">{formatKm(t.km)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Trips by month on a rail from the first year to the latest, with the years without a journey called out. */
function Rail({ ts, sum }: { ts: Trip[]; sum: TravelSummary }) {
  const from = sum.since!;
  const to = sum.perYear.at(-1)!.year;
  const years = to - from + 1;
  const marks = railMarks(ts, from, to);
  const quiet = quietYears(sum.perYear);
  const unknown = marks.some((m) => !m.known);
  const every = years > 12 ? 5 : 1;
  const cols = { gridTemplateColumns: `repeat(${years}, minmax(0, 1fr))` };
  const started = (y: number) => ts.filter((t) => t.legs[0].year === y).length;
  const label =
    `Trips by month, ${from} to ${to}: ` +
    sum.perYear.map((y) => `${y.year}, ${started(y.year) ? count(started(y.year), "trip", "trips") : y.journeys ? "a trip from the year before" : "none"}`).join("; ") +
    `. The latest, ${span(ts[ts.length - 1])}, is in the accent.`;
  return (
    <figure className="mt-6">
      <figcaption className="flex justify-between gap-4 stamp text-ink-3 mb-1.5">
        <span>Trips by month</span>
        <span className="inline-flex items-center gap-1.5 text-source" aria-hidden>
          <i className="w-2.5 h-1.5 bg-accent" /> Latest
          {unknown && (
            <>
              <i className="ml-2.5 w-2.5 h-1.5 shadow-[inset_0_0_0_1px_var(--ink-2)]" /> Month not known
            </>
          )}
        </span>
      </figcaption>
      <div role="img" aria-label={label}>
        <div className="relative" style={{ height: Math.max(2, ...marks.map((m) => m.lane + 1)) * 13 + 2 }}>
          {marks.map((m, i) => (
            <i
              key={m.trip}
              className={`trip-rail-mark pop ${i === marks.length - 1 ? "latest" : ""} ${m.known ? "" : "unknown"}`}
              style={{ left: pct(m.left), width: pct(m.width), "--lane": m.lane, animationDelay: `${i * 30}ms` } as CSSProperties}
              title={span(ts[m.trip])}
            />
          ))}
          {quiet
            .filter(([a, b]) => b > a)
            .map(([a, b]) => (
              <span key={a} className="absolute bottom-0 text-center font-mono text-source text-ink-3 uppercase whitespace-nowrap overflow-hidden" style={{ left: pct((a - from) / years), width: pct((b - a + 1) / years) }}>
                No journeys
              </span>
            ))}
        </div>
        <div className="grid h-1.5 border-t border-rule-strong" style={cols} aria-hidden>
          {Array.from({ length: years }, (_, i) => (
            <i key={i} className="border-l border-rule-strong last:border-r" />
          ))}
        </div>
        <div className="grid mt-1 font-mono text-source text-ink-3 text-center" style={cols} aria-hidden>
          {Array.from({ length: years }, (_, i) => {
            const y = from + i;
            const show = every === 1 || i === 0 || i === years - 1 || (y % every === 0 && y - from >= 2 && to - y >= 2);
            return (
              <span key={y}>
                {show && (
                  <>
                    <span className="max-sm:hidden">{y}</span>
                    <span className="sm:hidden">’{String(y).slice(2)}</span>
                  </>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </figure>
  );
}

/** Dialog body: the map with every place it can name, the figures, trips by month, and every trip by year with its legs. */
export function TravelFull({ journeys }: { journeys: Journey[] }) {
  if (!journeys.length) return NO_ITEMS;
  const ts = trips(journeys);
  const sum = summarize(journeys);
  const model = mapModel(journeys, ts, { aspect: [1.5, 2.6], drawnAt: 768, layers: [[NARROWEST, 295], [296, 559], [560, 768]] });
  const longest = ts.reduce((a, b) => (b.km > a.km ? b : a));
  const most = placeVisits(ts)
    .filter((p) => placeKey(p) !== placeKey(HOME))
    .sort((a, b) => b.trips - a.trips || b.last - a.last)[0];
  const around = sum.km / EARTH_AROUND_KM;
  // A figure is the value; what it belongs to goes on a line of its own, so the number is never cut.
  const stats: Array<[label: string, value: string, under?: string]> = [
    ["Trips", String(ts.length), `of ${count(sum.journeys, "journey", "journeys")}`],
    ["Countries", String(sum.countries.length), count(sum.cities, "city", "cities")],
    ["Travelled", `${formatKm(sum.km)} km`, around >= 0.1 ? `${around.toFixed(1)}× around the Earth` : undefined],
    ["Longest trip", `${formatKm(longest.km)} km`, `${span(longest)} · ${count(longest.legs.length, "leg", "legs")}`],
    ["Farthest", sum.farthest ? `${formatKm(sum.farthest.km)} km` : "—", sum.farthest ? `${sum.farthest.place.city}, from Sydney` : undefined],
    ["Most visited", most ? most.city : "—", most ? `on ${most.trips} of ${count(ts.length, "trip", "trips")}` : undefined],
  ];

  // Every trip under the year it set off, newest first; a run of years without a journey is one quiet line.
  const quiet = quietYears(sum.perYear);
  const blocks: Array<{ year: number; trips: Trip[] } | { quiet: [number, number] }> = [];
  for (let y = sum.perYear.at(-1)!.year; y >= sum.since!; y--) {
    const run = quiet.find(([, b]) => b === y);
    if (run) {
      blocks.push({ quiet: run });
      y = run[0];
      continue;
    }
    const these = ts.filter((t) => t.legs[0].year === y).reverse();
    if (these.length) blocks.push({ year: y, trips: these });
  }
  const latest = ts[ts.length - 1];
  const longestKm = longest.km;

  return (
    <div>
      <TravelMap model={model} />
      <Legend earlier={ts.length > 1} land={journeys.some((j) => j.by === "land")} />

      <dl className="raster grid-cols-2 sm:grid-cols-3 mt-6">
        {stats.map(([label, value, under]) => (
          <div key={label} className="px-3 py-2.5">
            <dt className="stamp text-ink-3">{label}</dt>
            <dd className="mt-1 font-mono text-item text-ink uppercase whitespace-nowrap">
              {value}
              {under && <span className="block text-dense text-ink-2 break-words whitespace-normal">{under}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <Rail ts={ts} sum={sum} />

      <h3 className="stamp text-ink-3 mt-8">Every trip</h3>
      {blocks.map((b) =>
        "quiet" in b ? (
          <p key={`q${b.quiet[0]}`} className="mt-5 pt-3 border-t border-rule-strong stamp text-ink-3">
            {b.quiet[0] === b.quiet[1] ? b.quiet[0] : `${b.quiet[0]} – ${b.quiet[1]}`} · No journeys
          </p>
        ) : (
          <section key={b.year} className="mt-5 pt-3 border-t border-rule-strong">
            <h4 className="flex items-baseline justify-between gap-4">
              <span className="font-display font-medium text-headline text-ink">{b.year}</span>
              <span className="stamp text-ink-3">
                {count(b.trips.length, "trip", "trips")} · {count(b.trips.reduce((s, t) => s + t.legs.length, 0), "journey", "journeys")}
              </span>
            </h4>
            <table className="w-full font-mono text-dense">
              <caption className="sr-only">Trips that set off in {b.year}, newest first; under each, its legs in the order travelled</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Leg</th>
                  <th scope="col">Month</th>
                  <th scope="col" className="hidden md:table-cell">By</th>
                  <th scope="col">Km</th>
                </tr>
              </thead>
              {b.trips.map((t, i) => (
                <tbody key={`${span(t)}|${i}`} className={i ? "border-t border-rule" : ""}>
                  <tr>
                    <th scope="rowgroup" colSpan={4} className="text-left font-normal pt-3 pb-2">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <span className="stamp text-ink">{span(t)}</span>
                        <span className="font-mono text-source text-ink-3 uppercase tracking-[0.04em]">
                          {endNote(t)} · {count(t.legs.length, "leg", "legs")} · {formatKm(t.km)} km
                        </span>
                      </span>
                      <Route trip={t} className="block mt-1.5 text-item" />
                      <Strip trip={t} longest={longestKm} latest={t === latest} delay={120} />
                    </th>
                  </tr>
                  {t.legs.map((j, k) => (
                    <tr key={k} className="align-top text-ink-2">
                      <td className="py-1 uppercase wrap-anywhere">
                        {j.from.city} → {j.to.city}
                      </td>
                      <td className="py-1 pl-4 w-12 whitespace-nowrap">{j.month ? when(j).split(" ")[0] : "—"}</td>
                      <td className="py-1 pl-4 w-12 whitespace-nowrap uppercase hidden md:table-cell">{j.by ? MODE_LABEL[j.by] : "—"}</td>
                      <td className="py-1 pl-4 w-20 text-right whitespace-nowrap">{formatKm(legKm(j))} KM</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </section>
        ),
      )}

      <p className="font-mono text-source text-ink-3 mt-6">
        From flight, rail and stay bookings · a journey runs from one stay to the next, so a change of planes on the way is not a place · a trip
        ends back where it began, at home in Sydney, where the record breaks, or before a stay of {STAY_MONTHS} months or more · a there-and-back
        under {SIDE_KM} km is a side trip, in brackets · bars show each trip&apos;s legs to scale, dotted by land · distances are great-circle, to the
        nearest 10 km · map: Natural Earth 1:50m on a 1° grid
      </p>
    </div>
  );
}
