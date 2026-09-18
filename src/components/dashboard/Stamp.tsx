import type { Freshness } from "@/lib/freshness";

/**
 * The freshness stamp: dot + mono time. The <time> carries what the client
 * ticker needs to re-derive the text once a minute; the state colour comes
 * from the nearest [data-freshness] ancestor (the card, or the strip entry).
 */
export function Stamp({ f, fixed = true, id }: { f: Freshness; fixed?: boolean; id?: string }) {
  return (
    <span id={id} className={`${fixed ? "min-w-stamp" : ""} stamp text-ink-2 inline-flex items-center gap-2 whitespace-nowrap stamp-text`}>
      <i aria-hidden className="dot size-1.5 rounded-full shrink-0" />
      <span className="stale-prefix">STALE ·</span>
      {f.at ? (
        <time
          dateTime={f.at.toISOString()}
          data-budget={f.budget}
          data-source={f.source}
          title={`${f.source === "content" ? "Newest item" : "Fetched"} ${f.at.toUTCString()}`}
        >
          {f.text}
        </time>
      ) : (
        <span>{f.text}</span>
      )}
    </span>
  );
}
