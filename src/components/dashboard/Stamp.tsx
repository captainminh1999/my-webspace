import type { Freshness } from "@/lib/freshness";
import { longStamp } from "@/lib/time";

/**
 * The freshness stamp: dot + mono age ("14 MIN AGO"). The <time> carries what
 * the client ticker needs to re-derive the text once a minute; the state
 * colour comes from the nearest [data-freshness] ancestor (the card, or the
 * strip entry). The absolute time is the tooltip.
 *
 * mode="dot" shows only the dot and keeps the age for assistive tech — for a
 * feed whose age is obvious from its content (the weather).
 */
export function Stamp({ f, fixed = true, id, mode = "text" }: { f: Freshness; fixed?: boolean; id?: string; mode?: "text" | "dot" }) {
  const title = f.at ? `${f.source === "content" ? "Newest item" : "Fetched"} ${longStamp(f.at)}` : undefined;
  return (
    <span
      id={id}
      title={title}
      className={`${fixed && mode === "text" ? "min-w-stamp" : ""} stamp text-ink-2 inline-flex items-center gap-2 whitespace-nowrap stamp-text`}
    >
      <i aria-hidden className="dot size-1.5 rounded-full shrink-0" />
      <span className={mode === "dot" ? "sr-only" : "contents"}>
        <span className="stale-prefix">STALE ·</span>
        {f.at ? (
          <time dateTime={f.at.toISOString()} data-budget={f.budget} data-source={f.source}>
            {f.text}
          </time>
        ) : (
          <span>{f.text}</span>
        )}
      </span>
    </span>
  );
}
