import { TimeTicks } from "@/components/dashboard/Sparkline";
import { monthDay, toDate } from "@/lib/time";

export interface NewsItem {
  title: string;
  url: string;
  image?: string;
  publishedAt: string;
  /** The paper it ran in, when the feed reads several (Coffee). */
  source?: string;
}

/**
 * Shared body for the headline feeds (Coffee, Drones): a thumbnail or mono
 * index, a two-line title, a mono paper and date — and the "when did these arrive" axis.
 * Thumbnails come from arbitrary publisher hosts, so they stay plain <img>
 * rather than going through the image optimizer.
 *
 * The stored order puts different papers first, which is what the card's few rows
 * want; the dialog shows everything, so it reads newest first.
 */
export function NewsList({ items, limit, now, source }: { items: NewsItem[]; limit?: number; now: Date; source?: string }) {
  if (!items.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  const shown = limit ? items.slice(0, limit) : [...items].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return (
    <div>
      <ul className="divide-y divide-rule">
        {shown.map((item, i) => {
          const d = toDate(item.publishedAt);
          return (
            <li key={item.url} className="py-2.5 flex gap-3 items-start">
              {item.image ? (
                <span className="size-12 shrink-0 rounded-thumb overflow-hidden bg-surface-2 border border-rule">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" width={48} height={48} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-12 object-cover" />
                </span>
              ) : (
                <span className="size-12 shrink-0 rounded-thumb bg-surface-2 border border-rule flex items-center justify-center font-mono text-dense text-ink-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div className="min-w-0">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-item text-ink line-clamp-2 hover:text-accent transition-colors duration-120">
                  {item.title}
                </a>
                <p className="font-mono text-source text-ink-3 mt-1 truncate">
                  {[item.source, d && monthDay(d)].filter(Boolean).join(" · ").toUpperCase()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <TimeTicks dates={items.map((i) => toDate(i.publishedAt)).filter((d): d is Date => !!d)} days={14} now={now} />
      {source && <p className="font-mono text-source text-ink-3 mt-4">Source: {source}</p>}
    </div>
  );
}
