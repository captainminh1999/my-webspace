"use client";
import { useId, useState, type ReactNode } from "react";

/**
 * SSR-correct clamping: the server renders the text already clamped with a
 * line-clamp utility, so there is no layout shift after hydration. The
 * "More" control is only rendered when the text is plausibly longer than
 * the clamp (a character-count heuristic — no measuring, no timers).
 */
export default function Clamp({
  chars,
  lines = 4,
  className = "",
  children,
}: {
  /** Total characters in the clamped content, for the heuristic. */
  chars: number;
  lines?: number;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const long = chars > lines * 80;
  const clamp = { 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4", 5: "line-clamp-5", 6: "line-clamp-6" }[lines] ?? "line-clamp-4";
  return (
    <div className={className}>
      <div id={id} className={open || !long ? "" : clamp}>
        {children}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="stamp text-ink-3 hover:text-accent transition-colors duration-120 mt-1"
        >
          {open ? "Less ↑" : "More ↓"}
        </button>
      )}
    </div>
  );
}
