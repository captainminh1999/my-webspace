// src/components/ErrorFrame.tsx — the frame shared by the 404 and the two error
// boundaries: a masthead-style band, then one ledger entry (folio, running head,
// h1, copy) and the two pages to go to instead. It reads nothing — no profile, no
// feeds, no clock — so it renders through a database outage, in the prerendered
// /_not-found, and in global-error, where the root layout is gone. Not a client
// component itself: error.tsx pulls it into the browser bundle, not-found.tsx
// renders it on the server. The links are plain <a>: a full page load, so leaving
// an error does not carry the client state that failed along with it.
import type { ReactNode } from "react";

const DESTINATIONS = [
  { folio: "01", href: "/", title: "Daily Dash", note: "Today's weather, space, news and the other live feeds." },
  { folio: "02", href: "/about-me", title: "CV", note: "Experience, education, licences, projects and the rest." },
] as const;

interface Props {
  /** Masthead kicker after "NHATMINH.DEV · ". */
  kicker: string;
  /** The large Fraunces folio beside the entry ("404"). Decorative, so `head` must say it too. */
  folio?: string;
  /** Mono running head above the h1, as on the CV ("02 · EXPERIENCE"). */
  head: string;
  /** error.digest: the hash that matches the server log entry. Never error.message. */
  reference?: string;
  title: string;
  /** Body copy, in the CV's 17px reading register. */
  children: ReactNode;
  /** Error boundaries only: a "Try again" button that calls this. */
  onRetry?: () => void;
}

export default function ErrorFrame({ kicker, folio, head, reference, title, children, onRetry }: Props) {
  return (
    <>
      <header className="border-b border-rule-strong">
        <div className="mx-auto max-w-page px-4 md:px-6 py-6">
          <p className="stamp text-ink-2 flex items-center gap-2">
            <i aria-hidden className="inline-block size-1.5 bg-accent" />
            NHATMINH.DEV · {kicker}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-page px-4 md:px-6 py-8 md:py-12">
        {/* A ledger row: the folio in its own column at md+, stacked above the entry on phones. */}
        <div className={folio ? "md:grid md:grid-cols-[auto_minmax(0,45rem)] md:gap-x-10" : "max-w-measure"}>
          {folio && (
            <p aria-hidden className="font-display font-medium text-ink text-[3.5rem] leading-none lg:text-numeral mb-6 md:mb-0">
              {folio}
            </p>
          )}
          <div className="min-w-0">
            <p className="stamp text-ink-3">
              {head}
              {reference && (
                <>
                  {" "}· REF <span className="break-all">{reference}</span>
                </>
              )}
            </p>
            <h1 className="font-display font-medium text-ink text-[2rem] leading-9 md:text-dateline md:leading-11 mt-2">{title}</h1>
            <div className="text-cv text-ink-2 mt-4 space-y-4">{children}</div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="stamp text-ink mt-6 h-10 px-4 border border-rule-strong rounded-card hover:border-accent hover:text-accent transition-colors duration-120 cursor-pointer"
              >
                Try again <span aria-hidden>↻</span>
              </button>
            )}
            <nav aria-label="Pages to go to instead" className="mt-10">
              <ul className="border-t border-rule">
                {DESTINATIONS.map((d) => (
                  <li key={d.href} className="border-b border-rule">
                    <a href={d.href} className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-4 focus-visible:-outline-offset-2">
                      {/* The folio is ledger furniture; the link is named by its title and note. */}
                      <span aria-hidden className="stamp text-ink-3">
                        {d.folio}
                      </span>
                      <span>
                        <span className="block font-display font-medium text-headline text-ink group-hover:text-accent transition-colors duration-120">
                          {d.title}
                        </span>
                        <span className="block text-dense text-ink-2 mt-1">{d.note}</span>
                      </span>
                      <span aria-hidden className="stamp text-ink-3 group-hover:text-accent transition-colors duration-120">
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </main>
    </>
  );
}
