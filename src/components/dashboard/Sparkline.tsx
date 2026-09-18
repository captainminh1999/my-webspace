/**
 * Server-rendered sparkline. The stroke draws itself once on load and again
 * on card hover (see .draw in globals.css); the fill is the accent at 10 %.
 */
export function Sparkline({
  values,
  height = 40,
  className = "",
}: {
  values: number[];
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const W = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L${W} ${height} L0 ${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className={`w-full block ${className}`}
      style={{ height }}
      aria-hidden
    >
      <path d={area} fill="var(--accent)" fillOpacity={0.1} className="fade" />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="draw"
      />
    </svg>
  );
}

/**
 * A horizontal time axis over the last `days` days with a tick per date —
 * the "when did these arrive" diagram under a news or release list.
 */
export function TimeTicks({ dates, days, now, label }: { dates: Date[]; days: number; now: Date; label?: string }) {
  const W = 100;
  const start = now.getTime() - days * 86400e3;
  const xs = dates
    .map((d) => ((d.getTime() - start) / (days * 86400e3)) * W)
    .filter((x) => x >= 0 && x <= W);
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} 8`} preserveAspectRatio="none" className="w-full block h-2" aria-hidden>
        <line x1={0} y1={7.5} x2={W} y2={7.5} stroke="var(--rule-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" className="grow" />
        {xs.map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={1}
            x2={x}
            y2={7.5}
            stroke="var(--accent)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className="pop"
            style={{ animationDelay: `${120 + i * 40}ms` }}
          />
        ))}
      </svg>
      <div className="flex justify-between font-mono text-source text-ink-3 mt-1">
        <span>{days} D AGO</span>
        <span>{label ?? "NOW"}</span>
      </div>
    </div>
  );
}
