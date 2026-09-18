import type { ReactNode } from "react";
import type { Freshness } from "@/lib/freshness";
import { Stamp } from "./Stamp";

// Header layout: the title, then the stamp and the affordance. The whole header is the
// button and its text content is its accessible name, so a stale stamp is read aloud.

interface CardProps {
  id: string;
  folio: string; // "01"
  title: string; // "WEATHER"
  freshness?: Freshness;
  /** Rendered at the bottom in the mono source register. */
  footer?: ReactNode;
  /** Extra Tailwind classes for grid placement. */
  className?: string;
  /** When false the header is not a dialog trigger (Profile). */
  opens?: boolean;
  children: ReactNode;
}

/**
 * The widget card (docs/DESIGN-DIRECTION.md § Widget card): bordered surface,
 * 40px header that opens the widget's dialog, body, optional footer.
 * No shadow, no transform; hover only changes colour.
 */
export function Card({ id, folio, title, freshness, footer, className = "", opens = true, children }: CardProps) {
  const header = (
    <>
      <span className="stamp text-ink-2 group-hover:text-ink transition-colors duration-120 truncate">
        <span className="text-ink-3">{folio}</span> {title}
      </span>
      <span className="flex items-center gap-4 shrink-0">
        {freshness && <Stamp f={freshness} fixed={false} />}
        {opens && (
          <span className="stamp text-ink-3 group-hover:text-accent transition-colors duration-120 hidden md:inline" aria-hidden>
            Open ↗
          </span>
        )}
      </span>
    </>
  );
  return (
    <article
      id={`card-${id}`}
      data-freshness={freshness?.state ?? "unknown"}
      className={`card group bg-surface border border-rule data-[freshness=stale]:border-t-2 data-[freshness=stale]:border-t-stale rounded-card overflow-hidden flex flex-col hover:border-rule-strong transition-colors duration-120 ${className}`}
    >
      {opens ? (
        <h2>
          <button
            type="button"
            data-open-dialog={id}
            className="h-10 px-4 border-b border-rule flex items-center justify-between gap-4 text-left w-full cursor-pointer focus-visible:-outline-offset-2"
          >
            {header}
          </button>
        </h2>
      ) : (
        <h2 className="h-10 px-4 border-b border-rule flex items-center justify-between gap-4">{header}</h2>
      )}
      <div className="card-body p-4 lg:p-5 flex-1 min-w-0">{children}</div>
      {footer && (
        <div className="card-footer h-7 px-4 border-t border-rule flex items-center justify-between gap-4 font-mono text-source text-ink-3 whitespace-nowrap overflow-hidden">
          {footer}
        </div>
      )}
    </article>
  );
}

interface DialogProps {
  id: string;
  folio: string;
  title: string;
  freshness?: Freshness;
  children: ReactNode;
}

/** The widget's full view: a native <dialog>, opened by DialogController via ?w=<id>. */
export function WidgetDialog({ id, folio, title, freshness, children }: DialogProps) {
  return (
    <dialog
      id={`dialog-${id}`}
      data-widget={id}
      data-freshness={freshness?.state ?? "unknown"}
      aria-labelledby={`dialog-${id}-title`}
      className="m-auto w-[min(60rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] bg-surface text-ink border border-rule rounded-card p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[calc(100dvh-2rem)]">
        <header className="h-12 px-5 border-b border-rule flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="stamp text-ink-3">{folio}</span>
            <h2 id={`dialog-${id}-title`} className="font-display text-headline font-medium truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {freshness && (
              <span className="hidden md:inline-flex">
                <Stamp f={freshness} fixed={false} />
              </span>
            )}
            <form method="dialog">
              <button type="submit" className="stamp text-ink-3 hover:text-accent transition-colors duration-120 py-2">
                Close <span aria-hidden>✕</span>
              </button>
            </form>
          </div>
        </header>
        {freshness?.state === "stale" && freshness.at && (
          <p className="px-5 py-2 border-b border-rule font-mono text-source text-stale">
            STALE · last successful fetch {freshness.at.toUTCString()}
          </p>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
