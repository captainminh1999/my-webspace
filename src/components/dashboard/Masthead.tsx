import Link from "next/link";
import type { Freshness } from "@/lib/freshness";
import type { WidgetId } from "@/types/dashboard";
import { dateline, hm, tzAbbrev } from "@/lib/time";
import { Stamp } from "./Stamp";
import ThemeToggle from "./ThemeToggle";
import FreshnessTicker from "./FreshnessTicker";

const LABEL: Record<WidgetId, string> = {
  weather: "WEATHER",
  tech: "NEWS",
  space: "SPACE",
  camera: "PHOTO",
  coffee: "COFFEE",
  verse: "VERSE",
  games: "GAMES",
  youtube: "VIDEO",
};

interface Props {
  now: Date;
  freshness?: Record<WidgetId, Freshness>;
  variant?: "dash" | "cv";
  /** Replaces the dateline on CV pages (the profile's name). */
  title?: string;
}

/**
 * Replaces the galaxy hero: a text band with the dateline, the Sydney clock,
 * the freshness strip for all feeds, the theme toggle and the CV link.
 * Everything here is in the first HTML flush and nothing is an image.
 */
export default function Masthead({ now, freshness, variant = "dash", title }: Props) {
  const entries = freshness ? Object.values(freshness) : [];
  const stale = entries.filter((f) => f.state === "stale");
  const fresh = entries.filter((f) => f.state === "fresh");
  const aging = entries.filter((f) => f.state === "aging").length;
  // A feed that has not run since it was added (no stamp yet) is waiting, not ageing.
  const pending = entries.filter((f) => f.state === "unknown").length;
  const ordered = [...stale, ...entries.filter((f) => f.state !== "stale")];

  return (
    <header className="border-b border-rule-strong">
      <div className="mx-auto max-w-page px-4 md:px-6 py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="min-w-0">
          <p className="stamp text-ink-2 flex items-center gap-2">
            <i aria-hidden className="inline-block size-1.5 bg-accent" />
            {variant === "dash" ? "DAILY DASH · NHATMINH.DEV" : "NHATMINH.DEV · CV"}
          </p>
          {(variant === "dash" || title) && (
            <h1 className="font-display font-medium text-ink text-[2rem] leading-9 md:text-dateline md:leading-11 mt-2">
              {title ?? dateline(now)}
            </h1>
          )}
          <p className="stamp text-ink-3 mt-2">
            SYDNEY · <span data-live-clock>{hm(now)}</span> {tzAbbrev(now)}
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-3 min-w-0">
          {variant === "dash" && freshness ? (
            <>
              {/* md+: every feed inline; stale feeds first */}
              <ul className="hidden md:flex flex-wrap justify-end gap-x-4 gap-y-1 stamp text-ink-2">
                {stale.length > 0 && (
                  <li className="text-stale">
                    <a href={`#card-${stale[0].id}`} className="hover:underline">
                      {stale.length} {stale.length === 1 ? "FEED" : "FEEDS"} STALE
                    </a>
                  </li>
                )}
                {ordered.map((f) => (
                  <li key={f.id} data-freshness={f.state} className="inline-flex items-center gap-1.5 stamp-text">
                    <i aria-hidden className="dot size-1.5 rounded-full" />
                    <a href={`#card-${f.id}`} className="hover:text-ink">
                      {LABEL[f.id]}{" "}
                      {f.at ? (
                        <time dateTime={f.at.toISOString()} data-budget={f.budget} data-source={f.source} data-short="" className="text-ink-3">
                          {f.age}
                        </time>
                      ) : (
                        <span className="text-ink-3">?</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
              {/* below md: the aggregate, expandable */}
              <details className="group md:hidden stamp text-ink-2">
                <summary className={`cursor-pointer list-none flex items-center gap-2 ${stale.length ? "text-stale" : fresh.length + pending === entries.length ? "text-fresh" : ""}`}>
                  <span aria-hidden className="inline-block transition-transform duration-120 group-open:rotate-90">▸</span>
                  {entries.length} FEEDS · {fresh.length} FRESH
                  {stale.length ? ` · ${stale.length} STALE` : ""}
                  {aging ? ` · ${aging} AGING` : ""}
                  {pending ? ` · ${pending} PENDING` : ""}
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {ordered.map((f) => (
                    <li key={f.id} data-freshness={f.state} className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <i aria-hidden className="dot size-1.5 rounded-full" />
                        {LABEL[f.id]}
                      </span>
                      <Stamp f={f} fixed={false} />
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : null}
          <div className="flex items-center gap-6 md:justify-end">
            <ThemeToggle />
            {variant === "dash" ? (
              <Link href="/about-me" className="stamp text-ink-2 hover:text-accent transition-colors duration-120">
                CV <span aria-hidden>→</span>
              </Link>
            ) : (
              <Link href="/" className="stamp text-ink-2 hover:text-accent transition-colors duration-120">
                <span aria-hidden>←</span> Daily Dash
              </Link>
            )}
          </div>
        </div>
      </div>
      <FreshnessTicker />
    </header>
  );
}
