import type { ReactNode } from "react";
import type { Freshness } from "@/lib/freshness";
import { longStamp } from "@/lib/time";
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
  /** "dot" hides the age text (kept for assistive tech) — the weather, whose age is obvious. */
  stamp?: "text" | "dot";
  children: ReactNode;
}

/**
 * The widget card (docs/DESIGN-DIRECTION.md § Widget card): bordered surface,
 * 40px header that opens the widget's dialog, body, optional footer.
 * No shadow, no transform; hover only changes colour.
 */
export function Card({ id, folio, title, freshness, footer, className = "", opens = true, stamp = "text", children }: CardProps) {
  const header = (
    <>
      <span className="stamp text-ink-2 group-hover:text-ink transition-colors duration-120 truncate">
        <span className="text-ink-3">{folio}</span> {title}
      </span>
      <span className="flex items-center gap-4 shrink-0">
        {freshness && <Stamp f={freshness} fixed={false} mode={stamp} />}
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
      {/* A flex column, so a body can let one element (a chart, an image) absorb the height of a taller row. */}
      <div className="card-body p-4 lg:p-5 flex-1 min-w-0 flex flex-col">{children}</div>
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
  stamp?: "text" | "dot";
  /** Sized to the content: lists read at 42rem, a photograph gets 48rem. */
  width?: "narrow" | "wide";
  children: ReactNode;
}

const WIDTH = {
  narrow: "w-[min(44.5rem,calc(100vw-2rem))]",
  wide: "w-[min(50.5rem,calc(100vw-2rem))]",
};

/** The widget's full view: a native <dialog>, opened by DialogController via ?w=<id>. */
export function WidgetDialog({ id, folio, title, freshness, stamp = "text", width = "narrow", children }: DialogProps) {
  return (
    <dialog
      id={`dialog-${id}`}
      data-widget={id}
      data-freshness={freshness?.state ?? "unknown"}
      aria-labelledby={`dialog-${id}-title`}
      className={`m-auto ${WIDTH[width]} max-h-[calc(100dvh-2rem)] bg-surface text-ink border border-rule rounded-card p-0 overflow-hidden`}
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
                <Stamp f={freshness} fixed={false} mode={stamp} />
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
            STALE · last successful fetch {longStamp(freshness.at)}
          </p>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
