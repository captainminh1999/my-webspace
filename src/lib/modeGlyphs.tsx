// Travel mode -> one of seven inline glyphs + the words a screen reader hears.
// Replaces the AIR / LAND / SEA words in the Travel dialog's leg rows; also used, at 12 px, in the map legend.
// Drawn on a 14-unit grid for their 14 px home: stroke 1, round caps and joins, fill none, currentColor.
// Horizontal and vertical edges sit on half units, so at 14 px every edge is one whole pixel (two at 2x).
// Wheeled vehicles share one axle line (y 10.5); every side view faces right, the way a leg reads (FROM -> TO).
import type { Mode } from "@/types/travel";

export type ModeGlyphName = "plane" | "car" | "bus" | "minivan" | "train" | "ferry" | "unknown";

/** The owner's pick for "land" (car | bus | minivan). Bus recommended: see the design note. */
export const LAND_GLYPH: ModeGlyphName = "bus";

const GLYPH: Record<Mode, ModeGlyphName> = { air: "plane", land: LAND_GLYPH, rail: "train", sea: "ferry" };
export const MODE_WORDS: Record<Mode, string> = { air: "By air", land: "By land", rail: "By rail", sea: "By sea" };

const PATHS: Record<ModeGlyphName, React.ReactNode> = {
  // Top view, nose right: a 2 px fuselage, swept wings, a small tailplane.
  plane: <path d="M13 7c0-.3-.3-.5-.75-.5H8.75L5.75 1.5H4.5L6 6.5H3.5L2.25 4.5H1.5L2 7l-.5 2.5h.75L3.5 7.5H6l-1.5 5h1.25l3-5h3.5c.45 0 .75-.2.75-.5z" />,
  // Side view: a two-pane glasshouse set back, a long hood.
  car: (
    <>
      <path d="M2.75 10.5h-.5a.75.75 0 0 1-.75-.75V8c0-.5.3-.9.8-1l1.2-.5L5 4a1 1 0 0 1 .85-.5H8.4a1 1 0 0 1 .8.4l2.05 2.6.6.2c.4.15.65.5.65.9v2.15a.75.75 0 0 1-.75.75h-.5M5.25 10.5h3.5M3.5 6.5h7.75M7.5 3.5v3" />
      <circle cx="4" cy="10.5" r="1.25" />
      <circle cx="10" cy="10.5" r="1.25" />
    </>
  ),
  // Side view: a long box, a window band with two pillars, a chamfered front.
  bus: (
    <>
      <path d="M2.75 10.5h-.5a.75.75 0 0 1-.75-.75v-6.5a.75.75 0 0 1 .75-.75h8.6c.4 0 .75.25.9.6l.6 1.6c.1.25.15.5.15.75v4.3a.75.75 0 0 1-.75.75h-.5M5.25 10.5h3.5M1.5 6.5h11M5.5 2.5v4M9.5 2.5v4" />
      <circle cx="4" cy="10.5" r="1.25" />
      <circle cx="10" cy="10.5" r="1.25" />
    </>
  ),
  // Side view: one box with a raked windscreen and a short nose.
  minivan: (
    <>
      <path d="M2.75 10.5h-.5a.75.75 0 0 1-.75-.75V4.5a1 1 0 0 1 1-1H8c.35 0 .65.15.85.45l1.9 2.55 1.2.35c.35.1.55.4.55.75v2.15a.75.75 0 0 1-.75.75h-.5M5.25 10.5h3.5M1.5 6.5h9.25M5.5 3.5v3" />
      <circle cx="4" cy="10.5" r="1.25" />
      <circle cx="10" cy="10.5" r="1.25" />
    </>
  ),
  // Front view, the rail pictogram: cab, windscreen, two lamps, the rails running away.
  train: <path d="M2.5 9.25V4A2.5 2.5 0 0 1 5 1.5h4A2.5 2.5 0 0 1 11.5 4v5.25c0 .7-.55 1.25-1.25 1.25h-6.5c-.7 0-1.25-.55-1.25-1.25zM2.5 5.5h9M4.5 8.5h1M8.5 8.5h1M4.5 10.5 3 12.5M9.5 10.5l1.5 2" />,
  // Side view: a hull with a raked bow, a deckhouse, a funnel, one wave.
  ferry: <path d="M1.5 6.5h11L11 9.5H3zM3.5 6.5V4a.5.5 0 0 1 .5-.5h4.75L10 6.5M6.5 3.5v-2M1.5 11.5c.92-.75 1.83-.75 2.75 0s1.83.75 2.75 0 1.83-.75 2.75 0 1.83.75 2.75 0" />,
  // Mode not known: the trip strip's hairline, as a dash (drawn in --ink-3 by the caller).
  unknown: <path d="M4.5 7.5h5" />,
};

/**
 * A leg's mode as a glyph. Decorative by default: the svg is aria-hidden and the words go in a visually
 * hidden span beside it (more reliable in a table cell than role=img), plus an svg <title> for the mouse
 * tooltip, which aria-hidden keeps out of the accessibility tree.
 */
export function ModeGlyph({ by, size = 14, className = "", glyph }: { by?: Mode; size?: 12 | 14 | 16 | 24; className?: string; glyph?: ModeGlyphName }) {
  const name = glyph ?? (by ? GLYPH[by] : "unknown");
  const words = by ? MODE_WORDS[by] : "Mode not known";
  return (
    <>
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
        <title>{words}</title>
        {PATHS[name]}
      </svg>
      <span className="sr-only">{words}</span>
    </>
  );
}

/** The legend form: the glyph only (the legend is aria-hidden; the map's role=img label carries the meaning). */
export function ModeGlyphBare({ glyph, size = 12, className = "" }: { glyph: ModeGlyphName; size?: 12 | 14; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
      {PATHS[glyph]}
    </svg>
  );
}
