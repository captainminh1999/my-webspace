import Image from "next/image";
import type { GameItem } from "@/types/games";
import { TimeTicks } from "@/components/dashboard/Sparkline";
import { monthDay, toDate } from "@/lib/time";

const url = (g: GameItem) => `https://rawg.io/games/${g.id}`;

export function GamesCard({ data, now }: { data: GameItem[]; now: Date }) {
  if (!data.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  const covers = data.filter((g) => g.thumbnail).slice(0, 3);
  return (
    <div>
      {covers.length > 0 && (
        <div className="raster grid-cols-3">
          {covers.map((g) => (
            <a key={g.id} href={url(g)} target="_blank" rel="noopener noreferrer" className="relative aspect-[3/4] overflow-hidden focus-visible:-outline-offset-2">
              <Image src={g.thumbnail} alt={g.name} fill sizes="(max-width: 768px) 33vw, 140px" quality={65} className="object-cover" />
            </a>
          ))}
        </div>
      )}
      <ul className="divide-y divide-rule mt-3">
        {data.slice(0, 5).map((g) => {
          const d = toDate(g.released);
          return (
            <li key={g.id} className="py-2 flex items-baseline justify-between gap-3">
              <a href={url(g)} target="_blank" rel="noopener noreferrer" className="text-item text-ink truncate hover:text-accent transition-colors duration-120">
                {g.name}
              </a>
              <span className="font-mono text-source text-ink-3 shrink-0">{d ? monthDay(d).toUpperCase() : ""}</span>
            </li>
          );
        })}
      </ul>
      <TimeTicks dates={data.map((g) => toDate(g.released)).filter((d): d is Date => !!d)} days={30} now={now} label="RELEASE DATES" />
    </div>
  );
}

export function GamesFull({ data, now }: { data: GameItem[]; now: Date }) {
  if (!data.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  return (
    <div>
      <ul className="divide-y divide-rule">
        {data.map((g) => {
          const d = toDate(g.released);
          return (
            <li key={g.id} className="py-3 flex items-center gap-4">
              <span className="block w-14 aspect-[3/4] shrink-0 rounded-thumb overflow-hidden bg-surface-2 border border-rule">
                {g.thumbnail && <Image src={g.thumbnail} alt="" width={56} height={75} quality={65} className="size-full object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <a href={url(g)} target="_blank" rel="noopener noreferrer" className="text-body text-ink hover:text-accent transition-colors duration-120">
                  {g.name}
                </a>
                <p className="font-mono text-source text-ink-3 mt-1">Released {d ? monthDay(d).toUpperCase() : g.released}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <TimeTicks dates={data.map((g) => toDate(g.released)).filter((d): d is Date => !!d)} days={30} now={now} label="RELEASE DATES" />
      <p className="font-mono text-source text-ink-3 mt-4">Source: RAWG · top-rated releases of the last 30 days</p>
    </div>
  );
}
