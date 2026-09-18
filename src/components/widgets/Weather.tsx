import type { WeatherData } from "@/types/weather";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { WeatherGlyph, glyphFor } from "@/lib/weatherGlyphs";
import { hour24, toDate, weekday } from "@/lib/time";

const r = (n: number) => Math.round(n);

function Hourly({ data, cells }: { data: WeatherData; cells: number }) {
  return (
    <div className="raster mt-3" style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }}>
      {(data.hourly ?? []).slice(0, cells).map((h) => {
        const d = toDate(h.dt)!;
        return (
          <div key={h.dt} className="py-1.5 text-center font-mono text-source leading-4 overflow-hidden">
            <div className="text-ink-3">{hour24(d)}</div>
            <div className="text-ink">{r(h.temp)}°</div>
          </div>
        );
      })}
    </div>
  );
}

function Daily({ data }: { data: WeatherData }) {
  const days = (data.daily ?? []).slice(0, 7);
  if (!days.length) return null;
  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  const span = hi - lo || 1;
  return (
    <div className="raster mt-3">
      {days.map((d, i) => {
        const date = toDate(d.dt)!;
        const left = ((d.min - lo) / span) * 100;
        const width = ((d.max - d.min) / span) * 100;
        return (
          <div key={d.dt} className="grid grid-cols-[3rem_1.5rem_1fr_2.5rem_2.5rem] items-center gap-2 px-2 h-8 font-mono text-dense">
            <span className="text-ink-2">{i === 0 ? "Today" : weekday(date)}</span>
            <WeatherGlyph code={d.icon} size={16} decorative className="text-ink-3" />
            <span className="relative h-0.5 bg-rule rounded-full">
              <span
                className="absolute top-0 h-0.5 rounded-full grow-x"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`,
                  background: "linear-gradient(90deg, var(--temp-min), var(--temp-max))",
                  animationDelay: `${i * 40}ms`,
                }}
              />
            </span>
            <span className="text-right text-temp-min">{r(d.min)}°</span>
            <span className="text-right text-temp-max">{r(d.max)}°</span>
          </div>
        );
      })}
    </div>
  );
}

/** Card body: the page's biggest live number, the 12-hour sparkline, hourly row, 7-day table. */
export function WeatherCard({ data }: { data: WeatherData }) {
  if (typeof data?.current?.temp !== "number") return <p className="font-mono text-dense text-ink-3">No items</p>;
  const { word } = glyphFor(data.current.icon);
  return (
    <div className="flex flex-col grow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display font-medium text-ink text-[3.5rem] leading-none lg:text-numeral tracking-tight">
            {r(data.current.temp)}°
          </p>
          <p className="mt-2 text-item text-ink-2">
            {word} <span className="text-ink-3">· Sydney</span>
          </p>
        </div>
        <WeatherGlyph code={data.current.icon} size={40} decorative className="text-ink-2 shrink-0 mt-1" />
      </div>
      <Sparkline values={(data.hourly ?? []).slice(0, 12).map((h) => h.temp)} className="mt-4" stretch />
      <Hourly data={data} cells={12} />
      <Daily data={data} />
    </div>
  );
}

/** Dialog body: the same diagrams, roomier, plus every hourly reading. */
export function WeatherFull({ data }: { data: WeatherData }) {
  if (typeof data?.current?.temp !== "number") return <p className="font-mono text-dense text-ink-3">No items</p>;
  const { word } = glyphFor(data.current.icon);
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-display font-medium text-ink text-numeral">{r(data.current.temp)}°</p>
          <p className="mt-2 text-body text-ink-2">
            {word} <span className="text-ink-3">· Sydney</span>
          </p>
        </div>
        <WeatherGlyph code={data.current.icon} size={56} decorative className="text-ink-2 shrink-0" />
      </div>
      <p className="stamp text-ink-3 mt-6">Next 12 hours</p>
      <Sparkline values={(data.hourly ?? []).slice(0, 12).map((h) => h.temp)} height={64} className="mt-2" />
      <Hourly data={data} cells={12} />
      <p className="stamp text-ink-3 mt-6">Next 7 days</p>
      <Daily data={data} />
      <p className="font-mono text-source text-ink-3 mt-6">Source: OpenWeather One Call · lat −33.87, lon 151.21</p>
    </div>
  );
}
