import type { Freshness } from "@/lib/freshness";

/**
 * The freshness stamp: dot + mono time. The <time> carries what the client
 * ticker needs to re-derive the text once a minute; the state colour comes
 * from the nearest [data-freshness] ancestor (the card, or the strip entry).
 */
export function Stamp({ f, fixed = true }: { f: Freshness; fixed?: boolean }) {
  return (
    <span className={`${fixed ? "w-stamp" : ""} stamp inline-flex items-center gap-2 whitespace-nowrap stamp-text`}>
      <i aria-hidden className="dot size-1.5 rounded-full shrink-0" />
      <span className="stale-prefix">STALE ·&nbsp;</span>
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
