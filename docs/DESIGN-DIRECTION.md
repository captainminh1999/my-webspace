# Design direction for nhatminh.dev

> **Shipped 2026-09-19.** Build-order steps 0–7 are live on `main`; the token sheet, fonts, masthead, card anatomy, freshness contract, motion policy (with the addendum's draw-once/replay-on-hover rule) and the CV treatment below are what the site now runs. Lighthouse mobile went 49 → 87 on the first deploy. Deviations from the text: the stamp column is a *minimum* width (a STALE stamp is wider than 7.5 rem); the card header hides the stamp's absolute time and the "Open ↗" affordance below `md` so titles never truncate; stale cards dim only images and diagrams, not text, to keep contrast; hourly labels are two-digit 24-hour so twelve cells fit a phone; the hover replay is implemented as a second animation added on hover, so nothing restarts on leave.
>
> **Revised 2026-09-19 (owner review).** The stamp shows the relative age only (`14 MIN AGO`); the absolute Sydney time is its tooltip; the Weather card shows the dot alone. Cards in a row share a height, and one element per card absorbs the difference (the Weather sparkline, the Space and Photography images, the Profile summary). Widget dialogs are sized to their content (44.5 rem for lists, 50.5 rem for images) instead of a fixed 60 rem. The ticker runs on mount, on every minute boundary and when the tab returns, because the HTML arrives from the ISR cache already minutes old; it lives in the masthead so the CV pages tick too.

## The recommendation

Build **Ledger, night edition**: the editorial data-page direction (leaderboard leader), shipped **dark by default** with the light "paper" theme as the opt-in, and with four ideas grafted in from the losing proposals.

In one paragraph: the home page stops being a dashboard app and becomes a set data page. A text masthead (a Fraunces dateline, a mono strip that reports the age of all nine feeds) replaces the galaxy hero. Nine bordered cards sit on a 12-column grid with hairline rules instead of shadows; every number, rank, time and age is set in a monospace register; one vermilion accent carries meaning (links, focus, the masthead mark) and three semantic colours carry data age. Sydney's temperature becomes the largest live number on the page and NASA's picture of the day is the daily lead photograph, so space stays on the site every day without a static stock nebula. The whole thing is server-rendered HTML with three client islands under 3KB combined, no animation library, and roughly 70-90KB of self-hosted fonts.

Why dark-first when the proposal was written light-first: the owner kept the site dark, chose a galaxy, and reads NASA feeds. Ledger's own palette already defines dark as a first-class equal (warm #0E0F12, not slate) and says the default is a one-line flip. Flipping it removes the one fatal flaw every judge raised against the leader without changing anything else. Light mode still exists, honours the OS preference, and is what makes the CV pages print and read well.

## Why this over the others

Aggregate leaderboard (three judges, different weightings):

| Rank | Key | Name | Avg | Firsts |
|---|---|---|---|---|
| 1 | editorial | Ledger | 50.3 | 1 (brand) |
| 2 | spaceDark | Deep Field | 49.7 | 1 (owner) |
| 3 | swiss | Rasterblatt | 49.3 | 1 (engineering) |
| 4 | wildcard | Contact Sheet | 45.0 | 0 |

The top three are within one point; the leader is not a landslide. The reason to follow the leaderboard anyway is that Ledger is the only proposal whose two real weaknesses are fixable inside the direction, while the runner-up's weakness is the direction itself.

| Judge | One-line verdict |
|---|---|
| Brand (fit, distinctiveness, longevity first) | Ledger wins because it is the only proposal whose argument is about the owner's profession rather than his hobbies; Rasterblatt is purer but deletes what he likes; Contact Sheet is original but a 2024 gimmick in three years; Deep Field is "Linear.app with a sky", the diagnosis we were asked to cure. |
| Engineering (performance, implementability, accessibility first) | Rasterblatt wins on the numbers that decide Lighthouse on a Moto G (text LCP, one font, no hero); Deep Field is the safest build; Ledger has the best freshness design and performance checklist but light-first and an APOD `priority` LCP undercut it; Contact Sheet's remote-CDN LCP, three families including Doto and a hard cron dependency make it the wrong bet for 49 to 90. |
| Owner (fit and implementability count double) | Deep Field wins because every taste signal maps onto it and it keeps the nebula, but it is "the current site done properly rather than something new"; Ledger is the strongest thinking and its freshness system should ship regardless; Contact Sheet and Rasterblatt strip out the parts of the site the owner enjoys. |

What each judge objected to in Ledger, and what this document does about it:

- **Light-first paper** (all three judges). Fixed by shipping dark as the default. Same tokens, one line.
- **APOD as `priority` LCP hands the score to apod.nasa.gov** (engineering). Fixed by making the mobile LCP a text node: on phones Space is the third card, below Weather and Hacker News, and the APOD image is never `priority`. On desktop the image can be LCP; desktop is not the target. The image is also served through the Next/Netlify image optimizer at 640px AVIF q70, so the origin's slowness only bites on the first request after each daily change.
- **Three font families, ~110KB** (brand, engineering, owner). Trimmed to two: Fraunces for display, IBM Plex Mono for data, body on the system stack. Budget 70-90KB, measured at build.
- **Fraunces at 56px next to 12px mono can read fussy** (brand). Rule kept and made mechanical: Fraunces exists only as three utilities (`text-numeral`, `text-dateline`, `text-headline`), none below 22px, so there is no way to reach for it small.

## Grafted ideas

Each graft is compatible with Ledger's grammar; nothing here changes the token sheet or the card anatomy beyond what is stated.

1. **The live temperature as the page's biggest number** (from Rasterblatt). Ledger's Weather card had a 56px numeral; it becomes 72px at lg (56px on mobile) with a 12-cell hourly row of tabular mono figures under the sparkline. It is server-rendered text that changes hourly, which is the honest expression of "live dashboard" and the cheapest possible above-the-fold paint. Rasterblatt's 96px was for a hero without a masthead; with a masthead above it, 72px is the right weight.
2. **The gap-1px hairline grid** (from Rasterblatt). Kept for every inner grid: the YouTube 3x3 thumbnail grid, the Games cover strip, the 7-day weather table, the CV Licences/Honors/Languages tables and the Experience ledger rows. Rules are drawn by the grid gap on a `--rule` background, so they reflow at every breakpoint with no border logic. The outer widget grid keeps Ledger's bordered cards and 16/24px gutters, because colourful thumbnails on a dark ground need breathing room that a 1px lattice does not give.
3. **Absolute-plus-relative stamp, fixed width** (from Contact Sheet's date-back stamp and Rasterblatt's FT-style stamp). Ledger's stamp read "14 MIN AGO"; the first build showed `07:46 · 14 MIN` (under 24h) or `14 SEP · 4 D` (older), set in Plex Mono rather than Doto, in a fixed 7.5rem column so ages of different length never shift the header. *Revised 2026-09-19:* the owner found the clock time confusing next to the age, so the stamp is the age alone again (`14 MIN AGO`, `4 D AGO`) and the absolute Sydney time is the tooltip; a stale feed still says `STALE ·` first and older than a day reads in days, which keeps the year-stale failure legible without colour. The Weather card, whose age is obvious from its content, shows only the dot (the age stays in the accessible name).
4. **"Latest item" as a distinct source state** (from Deep Field). When a feed has no `fetchedAt` but its newest item has a date, the stamp says `LATEST 1 D` in `--ink-3` instead of `AGE UNKNOWN`. Only feeds with nothing readable get `AGE UNKNOWN`. This keeps seven cards from looking broken during the weeks before every cron writes `fetchedAt`.
5. **Aggregate count on small screens** (from Contact Sheet's sheet-header status line). Ledger's masthead strip lists all nine feeds inline, which is too long for a 375px phone. Below `md` the strip collapses to `9 FEEDS · 8 FRESH · 1 STALE` inside a native `<details>` that expands to the full list. No JS.
6. **Hollow dot for aging** (from Deep Field). Fresh is a filled dot, aging a 1px ring, stale a filled dot with the 2px card rule. Colour is no longer the only cue.
7. **Inline SVG weather glyphs** (from Deep Field, with Rasterblatt's condition word as the fallback). The 50x50 openweathermap PNGs go; the icon code maps to one of eight inline paths plus the condition word.

Not grafted, and why: Deep Field's nebula scrim band (reintroduces an image as the mobile LCP and contradicts the text masthead; see "What you give up" for the opt-in), Rasterblatt's grayscale thumbnails (fights the owner's taste and dark mode), Contact Sheet's dashed stale border and Doto (the 2px rule already flags stale at thumbnail size; a dot-matrix face for the one hard requirement is the wrong risk), Deep Field's lit-edge inset highlight and 16px radius (the genre tell the brief is allergic to).

## Token sheet

Replace `src/app/globals.css` wholesale. Delete `tailwind.config.ts` (unreferenced under v4; its `darkMode: 'class'` and four plugins have never applied) and the `@tailwindcss/aspect-ratio`, `forms`, `line-clamp`, `typography` and `autoprefixer` devDependencies.

```css
/* src/app/globals.css */
@import "tailwindcss";

/* data-theme is set on <html> before paint by the inline script in layout.tsx.
   Dark is the default; the OS preference is honoured on first visit; the toggle persists. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
@custom-variant light (&:where([data-theme="light"], [data-theme="light"] *));

/* ---- Raw tokens: dark (default) ---- */
:root {
  color-scheme: dark;
  --bg: #0E0F12;            /* page ground: warm near-black, not slate */
  --surface: #16181D;       /* card, dialog, CV table row */
  --surface-2: #1D2026;     /* table head, image frames, mono blocks */
  --ink: #ECEAE4;           /* primary text, sparkline stroke, numerals */
  --ink-2: #A7ABB3;         /* secondary text, kickers, captions */
  --ink-3: #7E838C;         /* tertiary: source lines, folios, unknown-age (4.7:1 on --surface) */
  --rule: #262A31;          /* hairlines */
  --rule-strong: #363B44;   /* hover/focus borders, masthead rule */
  --accent: #FF6A3D;        /* vermilion: masthead mark, link hover, focus ring, sparkline fill @10% */
  --accent-soft: rgb(255 106 61 / 0.14);
  --fresh: #3DBB7A;
  --aging: #E0A431;
  --stale: #F26B5B;
  --temp-max: #FF6A3D;
  --temp-min: #6FA8FF;
  --scrim: rgb(14 15 18 / 0.6);   /* dialog backdrop */
}

/* ---- Raw tokens: light (paper) ---- */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;
    --bg: #F7F5F0; --surface: #FFFFFF; --surface-2: #F1EEE7;
    --ink: #15171A; --ink-2: #4A4F57; --ink-3: #6B7079;
    --rule: #E3DFD6; --rule-strong: #C9C3B6;
    --accent: #C8381F; --accent-soft: rgb(200 56 31 / 0.12);
    --fresh: #1F7A4D; --aging: #8A5A12; --stale: #B42318;
    --temp-max: #C8381F; --temp-min: #2B6CB0;
    --scrim: rgb(21 23 26 / 0.45);
  }
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #F7F5F0; --surface: #FFFFFF; --surface-2: #F1EEE7;
  --ink: #15171A; --ink-2: #4A4F57; --ink-3: #6B7079;
  --rule: #E3DFD6; --rule-strong: #C9C3B6;
  --accent: #C8381F; --accent-soft: rgb(200 56 31 / 0.12);
  --fresh: #1F7A4D; --aging: #8A5A12; --stale: #B42318;
  --temp-max: #C8381F; --temp-min: #2B6CB0;
  --scrim: rgb(21 23 26 / 0.45);
}

/* ---- Tailwind v4 theme: utilities read the variables, so no dark: prefixes are needed ---- */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-fresh: var(--fresh);
  --color-aging: var(--aging);
  --color-stale: var(--stale);
  --color-temp-max: var(--temp-max);
  --color-temp-min: var(--temp-min);

  --font-display: var(--font-fraunces), Georgia, "Times New Roman", serif;
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Type scale (px in comments; rem in values). Fraunces is reachable only through the last three. */
  --text-source: 0.6875rem;  --text-source--line-height: 1rem;                                   /* 11/16 */
  --text-kicker: 0.75rem;    --text-kicker--line-height: 1rem;   --text-kicker--letter-spacing: 0.08em; /* 12/16 */
  --text-dense: 0.8125rem;   --text-dense--line-height: 1.125rem;                                /* 13/18 */
  --text-item: 0.875rem;     --text-item--line-height: 1.25rem;                                  /* 14/20 */
  --text-body: 1rem;         --text-body--line-height: 1.5rem;                                   /* 16/24 */
  --text-cv: 1.0625rem;      --text-cv--line-height: 1.6875rem;                                  /* 17/27 */
  --text-headline: 1.375rem; --text-headline--line-height: 1.75rem;                              /* 22/28 Fraunces */
  --text-h2: 1.75rem;        --text-h2--line-height: 2.125rem;                                   /* 28/34 Fraunces */
  --text-dateline: 2.5rem;   --text-dateline--line-height: 2.75rem;                              /* 40/44 Fraunces */
  --text-numeral: 4.5rem;    --text-numeral--line-height: 1;   --text-numeral--letter-spacing: -0.02em; /* 72 Fraunces */

  --radius-card: 6px;
  --radius-thumb: 3px;
  --container-page: 82.5rem;     /* 1320px */
  --container-measure: 45rem;    /* 720px CV column */
  --spacing-stamp: 7.5rem;       /* fixed freshness column */
  --shadow-*: initial;           /* no shadow utilities exist to reach for */
}

@layer base {
  html { background: var(--bg); }
  body { background: var(--bg); color: var(--ink); font-family: var(--font-sans); font-size: 1rem; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .font-mono, [class*="text-kicker"], [class*="text-source"] { font-variant-numeric: tabular-nums; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { *, ::before, ::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }
}

@layer components {
  /* Rasterblatt's hairline grid, used for inner grids and CV tables */
  .raster { display: grid; gap: 1px; background: var(--rule); }
  .raster > * { background: var(--surface); }
  /* Ledger's mono stamp register */
  .stamp { font-family: var(--font-mono); font-size: 0.75rem; line-height: 1rem; letter-spacing: 0.08em; text-transform: uppercase; font-variant-numeric: tabular-nums; }
  /* Native dialog entrance; falls back to instant where @starting-style is unsupported */
  dialog[open] { opacity: 1; transition: opacity 150ms ease-out, overlay 150ms allow-discrete, display 150ms allow-discrete; }
  dialog { opacity: 0; }
  @starting-style { dialog[open] { opacity: 0; } }
  dialog::backdrop { background: var(--scrim); }
}
```

Contrast notes (all checked against the surface they sit on): dark `--ink-3` was lifted from Ledger's #6F747D to #7E838C to pass 4.5:1 on `--surface` for 11px source lines; light `--aging` was darkened from #B7791F to #8A5A12 (5.9:1) and light `--ink-3` from #7A808A to #6B7079 (5.0:1). Every other Ledger value passes as proposed. Light `--accent` on `--bg` is 4.75:1, which is fine for 14px links but do not use it for 11px text on the paper ground.

Theme script (inline in `layout.tsx` `<head>`, before any stylesheet is applied; ~300 bytes):

```html
<script>
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
  } catch (e) { document.documentElement.dataset.theme = 'dark'; }
</script>
```

## Typography

Two families, self-hosted by `next/font`, plus the system stack for body. Total budget 70-90KB across all pages, versus Ledger's ~110KB and the current 0KB (Arial 18px). The layout.tsx comment "Use system fonts to avoid build-time downloads" is a real constraint only if the build environment blocks outbound network; Netlify builds do not, but if a build ever fails on font download, drop the same two families into `src/fonts/` and switch to `next/font/local` with identical `variable` names. Nothing else changes.

```ts
// src/app/layout.tsx
import { Fraunces, IBM_Plex_Mono } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-fraunces",
  adjustFontFallback: true,
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-plex-mono",
  adjustFontFallback: false, // no mono default in next/font; a synthesised Arial fallback breaks tabular figures
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

// <html lang="en" className={`${fraunces.variable} ${plexMono.variable}`} suppressHydrationWarning>
```

Fraunces: add `axes: ["opsz"]` only if the resulting file in `.next/static/media` stays under 70KB; the optical-size cut is nicer at 72px but the 22px minimum means the default cut is acceptable. Fraunces is used for exactly four things: the masthead dateline (40px, 32px mobile), the temperature numeral (72px, 56px mobile), card headlines (22px: APOD caption, the Profile card name at 28px) and the CV name (56px, 44px mobile) and CV h2s (28px). Never below 22px; there is no utility that lets it happen.

IBM Plex Mono 400: every numeral, rank, time, date, age, kicker, folio, source line and CV date column; `tabular-nums` always. One weight; emphasis inside the mono register is done with `--ink` versus `--ink-2`, not with weight.

Body: system stack at 16px/24 on the dashboard (down from 18px Arial), 17px/27 in the CV's 720px measure, weight 400 with 600 for the few bolds. Zero bytes, zero CLS.

Scale (px, line-height): 11/16 source · 12/16 kicker and stamp · 13/18 dense rows and captions · 14/20 list titles · 16/24 body · 17/27 CV body · 22/28 headline · 28/34 h2 · 40/44 dateline · 72/72 numeral. Spacing on a 4px base; card padding 16px (20px at lg); gutters 16px below md, 24px at md+.

## Layout

Container `max-w-page` (1320px), side margin 16px on mobile, 24px at md, centred above 1368px. Tailwind default breakpoints; the `useResponsiveLayout` hook, `ORIGINAL_LAYOUTS` and the resize listener in `dashboard-grid.tsx` go away in favour of `md:col-span-*` / `lg:col-span-*` classes on each card. `grid-auto-rows: auto`; rows stretch (the grid default — revised 2026-09-19, the first build used `align-items: start` and the ragged row bottoms read as a mistake on wide screens), so each card body is a flex column in which one element absorbs the difference: the Weather sparkline (`flex-basis` 40px, grows), the Space and Photography image frames (`aspect-ratio` plus `flex-grow`), the Profile summary with the CV link on `mt-auto`; list cards simply end above their footer.

**Masthead** (server component, replaces HeroImage and HeroSkeleton). Full-width band with a 1px `--rule-strong` bottom rule, 24px vertical padding.
- Left: stamp `DAILY DASH · NHATMINH.DEV` with a 6px `--accent` square before it; the dateline in Fraunces 40px `Thursday 18 September 2026`; a mono line `SYDNEY · 07:46 AEST` rendered at request time.
- Right (below on mobile): the freshness strip (see Data freshness) and a two-state text toggle `Light / Dark`, plus a mono `CV →` link to /about-me.
- No image. Everything in the masthead is in the first HTML flush.

**Widget grid at lg (12 columns), 24px gutters:**

| Row | Cards |
|---|---|
| 1 | 01 Weather (span 4) · 02 Space (span 8; APOD as the lead photograph, caption in Fraunces 22px, EPIC Earth 96px thumb in the footer) |
| 2 | 03 Hacker News (span 4) · 04 Photography (span 4; Unsplash 4:3, credit in the footer) · 05 Profile (span 4; name Fraunces 28px, headline, three mono facts, `Read the CV →`) |
| 3 | 06 Coffee (span 4) · 07 Drones (span 4) · 08 Games (span 4; three 64x86 covers in a `.raster` strip above a dated list) |
| 4 | 09 YouTube (span 12; nine 16:9 thumbs in a 3x3 `.raster` grid) |

**At md (6 columns):** Weather 3, Space 3, then every card 3, YouTube 6 (3x3 thumbs).

**On mobile (1 column), DOM order = visual order:** Weather, Hacker News, Space, Profile, Photography, Coffee, Drones, Games, YouTube (thumbs 120px beside titles). Hacker News sits second on purpose so the first viewport on a Moto G is text only and the LCP is a text node; Space is one swipe down. If the owner prefers Space second on phones, it is a single `order` class, and the Lighthouse run in the checklist decides whether the APOD as LCP stays under 2.5s.

**Card open:** clicking a card header opens the widget's full view in a native `<dialog>` (sized to its content: 44.5 rem for lists and the weather, 50.5 rem for the Space and Photography views, never wider than the viewport minus 2 rem; `--surface`, 1px `--rule`, 6px radius) addressed by `?w=id` so deep links still work. The dialog controller is the only client island in the grid besides the theme toggle and the freshness ticker.

**About-me pages** use no grid and no cards; see the About-me section.

## Widget card

Container: `bg-surface border border-rule rounded-card overflow-hidden flex flex-col`; no shadow, no transform. Stale adds `border-t-2 border-t-stale` so the flag survives at thumbnail size.

Header (40px, `px-4 border-b border-rule flex items-center justify-between`), the whole thing a `<button aria-label="Open Weather">`:
- Left: kicker in `.stamp` `text-ink-2`, composed as folio + title: `01 WEATHER`, `02 SPACE`, `03 HACKER NEWS`. The folio is `text-ink-3` so the title reads first.
- Right: the freshness stamp (dot + `14 MIN AGO`; the Weather card shows the dot alone), then `Open ↗` in `.stamp text-ink-3` that turns `text-accent` on card hover.

Body (`p-4 lg:p-5`): rows of 40-48px separated by 1px `--rule`; title 14px `text-ink line-clamp-2`; meta line mono 12px `text-ink-3` (rank, date, channel); thumbnails in a `--surface-2` frame with 1px `--rule` and 3px radius at fixed sizes (YouTube 96x54, Games 40x54 cover, Coffee/Drones 48x48 if the feed has one, else a mono index; Hacker News none). Full colour at rest; nothing grayscaled.

Weather body (the exception): the numeral in Fraunces 72px `text-numeral` with the condition word and an inline SVG glyph at 40px beside it; a server-rendered 12-hour SVG sparkline (height 40, stroke `--ink` 1.5px, area fill `--accent` at 10%); beneath it a 12-cell `.raster` row of hourly figures in mono 12px (time above temperature); then a 7-day `.raster` table with mono day, a 2px min-to-max range bar (`--temp-min` to `--temp-max`), and the two figures right-aligned in tabular mono.

Footer (optional, 28px, mono 11px `text-ink-3`): `Source: OpenWeather · Fetched 07:46 AEST` or `Photo by Name on Unsplash`. Only on feeds with an attribution obligation or an absolute time worth repeating. A stale card gains a footer line `Last successful fetch 14 Sep 2026 07:46 AEST` regardless.

States: hover changes `border-rule` to `border-rule-strong`, kicker to `text-ink`, `Open ↗` to `text-accent`, all 120ms colour transitions; focus-visible is the global 2px `--accent` outline; list links underline on hover (1px, offset 3px, `--accent` decoration). No scale, no shadow, no translate; the current `hover:scale-[1.02]` is removed.

Skeletons are deleted; the cards are server-rendered with data, so there is nothing to shimmer. An empty feed shows the header, an `AGE UNKNOWN` stamp and one mono line `No items` in `text-ink-3`.

## Data freshness

**Contract.** Every cron job writes an ISO `fetchedAt` into a `singletons` doc `{ _id: 'meta', fetchedAt: { weather, tech, coffee, drones, space, youtube, camera, games } }` (one line per job); `get-all-widgets` returns it as `meta`. This is the shared first task for any direction and lives outside `src/`. Fallbacks while jobs catch up: weather uses its existing `updated` epoch; YouTube uses `max(items.publishedAt)`; photography `createdAt`; EPIC `date`; Coffee, Drones, Tech and Games use their newest `publishedAt`/`released`. A value that comes from content rather than a fetch is marked `source: 'content'`.

**Budgets** (fresh / aging / stale): weather 0-2h / 2-6h / over 6h; every daily feed 0-30h / 30-72h / over 72h. `content`-sourced ages are judged on the same budgets but rendered as `LATEST`. Unknown is treated as aging.

**Rendering.** A server component computes age at request time (`revalidate = 60`):

```tsx
// <Freshness at={iso} budget="hourly" | "daily" source="fetched" | "content" | "none" />
// Output, e.g.:
<span className="w-stamp stamp text-ink-2 inline-flex items-center gap-2">
  <i aria-hidden className="size-1.5 rounded-full bg-fresh" />
  <time dateTime={iso} data-budget="hourly" title="Fetched 18 Sep 2026, 07:46 AEST">07:46 · 14 MIN</time>
</span>
```

Text forms: `JUST NOW`, `14 MIN AGO`, `3 H AGO`, `4 D AGO`; content-sourced `LATEST 1 D`; none `AGE UNKNOWN`; the masthead strip shows the bare age (`3 H`). The absolute time is the stamp's tooltip (`Fetched 19 Sep 2026, 05:32 AEST`). Sydney time throughout (`Intl` with `Australia/Sydney`). One client island, `FreshnessTicker` (under 1KB), re-derives every visible `<time>` from its `dateTime` and `data-budget` and sets the masthead clock: on mount (the page comes from the ISR cache, so its HTML is often minutes old), on every minute boundary, and when the tab returns to the foreground. It renders inside the masthead, so the CV pages tick as well.

**States.**
- FRESH: filled `--fresh` dot, text `--ink-2`.
- AGING: 1px `--aging` ring (hollow dot), text `--aging`.
- STALE: filled `--stale` dot, text `--stale` prefixed `STALE ·`, the card's 2px `--stale` top rule, body images and diagrams at opacity 0.72 — text stays at full opacity to keep its contrast (not grayscale, which fights dark mode), and the footer notice with the absolute last-fetch time. The dialog for that widget repeats the notice in its header.
- UNKNOWN / LATEST: `--ink-3` dot, text `--ink-3`.

**Masthead strip.** At md+ a mono 12px inline list of all nine: `WEATHER 14 MIN · NEWS 3 H · SPACE 1 D · ...` each with its dot, in `--ink-2`. If any feed is stale the strip re-sorts stale feeds first and prefixes `2 FEEDS STALE` in `--stale`, linking to the first stale card by anchor. Below md the strip is a `<details>` whose summary is the aggregate `9 FEEDS · 8 FRESH · 1 STALE` (count in `--fresh` when all fresh, `--stale` when any stale) and whose body is the full list. No toasts, no badges, no icons: the age is typographic.

## Motion

Policy: colour moves, nothing else does.

- Moves: `color` and `border-color` on hover/focus (120ms ease-out); the `<dialog>` opacity 0 to 1 over 150ms with `@starting-style` and `allow-discrete`, backdrop from transparent to `--scrim`; the freshness text change on each minute (a DOM text swap, no animation). The theme toggle swaps `data-theme` with no transition, to avoid a frame of mixed colours.
- Does not move: cards (no scale, translate or shadow growth), the sparkline (static SVG), images (explicit `width`/`height` inside a `--surface-2` frame, so nothing needs a fade), the masthead, CV lists. No staggered entrances, no parallax, no skeleton shimmer.
- `prefers-reduced-motion` zeroes both transitions via the global rule in the token sheet.
- JS: `framer-motion` removed from `package.json` (ModalFrame is its only consumer; the LazyMotion chunk is ~30KB gzipped and becomes ~40 lines of dialog code). `lucide-react` reduced to zero on the home route (arrow, close and external-link glyphs become three inline SVG paths) and to at most three icons on the CV pages, or removed entirely by turning `formatters.ts`'s social icons into inline SVGs. Client islands on `/`: `ThemeToggle` (~0.6KB), `FreshnessTicker` (<1KB), `WidgetDialog` (loads a widget's full view on click via `next/dynamic`; nothing loads before a click). First-load JS target for `/`: under 110KB gzipped, essentially the Next/React runtime.

## About-me pages

The CV becomes a long-form profile on `--bg` with no `--surface` cards; structure comes from rules and type. The masthead band is reused with kicker `NHATMINH.DEV · CV` and a `← Daily Dash` link on the right; the theme toggle stays.

Header block, left-aligned to the content column (not centred): name in Fraunces 56px (44px mobile) `text-ink`; headline `Data Management Specialist @ oSpace` in 18px `text-ink-2` (no purple anywhere); a mono line `SYDNEY · UPDATED SEP 2026 · 9 SECTIONS`; then the website and social links as a mono list separated by middots with 1px underlines. No icon buttons.

Reading layout at lg: a 240px sticky left rail listing the nine sections as a mono folio index (`01 About` ... `09 Recommendations`), the current section marked by a 2px `--accent` left rule via `:target`; and a `max-w-measure` (720px, 68ch of 17px/27) content column. Below lg the rail becomes a horizontally scrolling mono index under the header.

Sections: separated by 1px `--rule` with 48px space; each opens with a `.stamp` running head (`02 · EXPERIENCE`) and a Fraunces 28px h2.
- Experience and Education: a two-column ledger in a `.raster` grid, 120px mono date column (`2022 — NOW`) left, content right (company 600 16px, role 16px `text-ink-2`, bullets 17px with `line-clamp-4` and the existing `ExpandableText` restyled as a mono `More` text control). The current role's date cell carries a 2px `--accent` left rule.
- Licences: three-column `.raster` table (Name / Issuer / Issued) with mono dates and a `Credential ↗` link. Honors, Languages, Volunteering: compact `.raster` tables.
- Projects: title, mono date, one paragraph, `Repo ↗` link.
- Recommendations: block quotes with a 2px `--rule-strong` left rule, attribution in mono.
- Skills: the six-colour random chip cloud becomes an alphabetised mono list in three columns at lg (two at md).

Subpages (`/about-me/experience` etc.) reuse the shell through `SectionPageLayout` with the rail collapsed to `← Index` and a mono folio `SECTION 02 OF 09`; the `border-b-2 border-indigo-500` heading rule becomes the 1px `--rule`. Everything is server-rendered; `ExpandableText` is the only client component. The hidden `/admin/upload` page gets twelve lines of plain form CSS (1px `--rule` inputs, `--accent` focus) so `@tailwindcss/forms` can go.

## Performance checklist

Starting point: mobile 49, a11y 100, SEO 100. The score is dominated by a remote 1600px q85 Unsplash hero that is preloaded, nine lazy card chunks hydrating a skeleton grid, framer-motion, a per-second timer, and gtag.js on `afterInteractive`. Expected landing: 88-93, with GA the swing between 88 and 92.

| # | Change | Where | Why it moves the score |
|---|---|---|---|
| 1 | Delete the Unsplash hero: `HeroImage.tsx`, `HeroSkeleton.tsx`, the `<link rel="preload" as="image">` and the `images.unsplash.com` preconnect in `layout.tsx`, `public/hero.webp` (205KB) and the `.hero-image` CSS. | `src/app/layout.tsx`, `src/components/` | Removes 150-250KB from the mobile critical path; LCP becomes the masthead text. Expect 49 to ~65 on its own. |
| 2 | Server-render the grid: `page.tsx` calls `fetchAllWidgetsData()` and passes each widget's data as props; the nine card bodies become server components; `DashboardView.client.tsx`, `withWidgetData`, `useWidgetData`, `hydrateWidgetCache` and the nine `dynamic()` card imports in `widgetRegistry.tsx` go. Only the dialog bodies stay dynamic, loaded on click. | `src/app/`, `src/lib/widgetRegistry.tsx`, `src/components/widgets/` | Kills the skeleton-to-content CLS, nine chunk requests and the hydration waterfall. Largest TBT win. |
| 3 | Move `useSearchParams` out of `dashboard-grid.tsx` into a leaf `WidgetDialog` island so the grid HTML is in the first flush rather than behind a Suspense boundary. | `src/app/dashboard-grid.tsx` | FCP/LCP. |
| 4 | Remove `framer-motion`; `ModalFrame` becomes a native `<dialog>`. Delete the 1s `setInterval` in `WeatherWidget.tsx`. Replace lucide on the home route with inline SVGs. | `package.json`, `src/components/ModalFrame.tsx` | 200-400ms TBT on the throttled Moto G profile. |
| 5 | Fonts via `next/font/google` only (Fraunces 500/600, Plex Mono 400), latin, `display: swap`, `adjustFontFallback`; remove the Arial/18px body rule. Check `.next/static/media` totals under 90KB. | `src/app/layout.tsx`, `globals.css` | Self-hosted, preloaded, no third-party request, near-zero CLS. |
| 6 | Images: every thumbnail through `next/image` with explicit `width`/`height` and `sizes`; YouTube `mqdefault.jpg` not `hqdefault`; game covers at 80px; APOD lead `quality={70}`, `sizes="(max-width:768px) 100vw, 640px"`, never `priority`; extend the space cron to store APOD `width`, `height` and a 16px `blurDataURL`, and fall back to EPIC when APOD is a video or over 4000px. Replace openweathermap PNGs with inline SVG glyphs. | `next.config.ts`, widgets, cron | CLS 0, fewer bytes, no third-party image hosts above the fold. |
| 7 | Tighten `remotePatterns` to the real hosts (apod.nasa.gov, epic.gsfc.nasa.gov, i.ytimg.com, media.rawg.io, images.unsplash.com, plus the coffee/drone hosts enumerated from live data) and delete the `hostname: '**'` https and http catch-alls. | `next.config.ts` | The optimizer stops being an open proxy; unrelated to the score but the cheapest security fix on the list. |
| 8 | GTM: both `<Script>` tags to `strategy="lazyOnload"`, drop the googletagmanager preconnect. If the score stalls in the mid-80s, replace GA with Netlify Analytics (server-side, zero client JS). | `src/app/layout.tsx` | gtag.js is ~90KB and the largest remaining TBT contributor. |
| 9 | CSS: one `@import "tailwindcss"` plus the `@theme` block; delete `tailwind.config.ts`, the `@tailwind base/components/utilities` lines, the duplicate `:root` blocks, and the four plugins plus `autoprefixer`. | `globals.css`, `package.json` | ~10-15KB CSS; build stops processing a dead v3 config. |
| 10 | Caching: keep `revalidate = 60`; add `Cache-Control: public, s-maxage=60, stale-while-revalidate=600` for `/` and `Netlify-CDN-Cache-Control` at 60s on `/.netlify/functions/get-all-widgets`; keep `_next/static` immutable. | `netlify.toml` | The server render stops waiting on MongoDB on every request; TTFB. |
| 11 | Verify: `next build` (First Load JS for `/` under 110KB), then `npx lighthouse https://<deploy-preview> --preset=mobile` after steps 1, 4 and 8, recording each score in the commit message. Targets: LCP 1.6-2.2s, TBT under 150ms, CLS 0. | CI / deploy preview | Ties each step to a number so regressions are visible. |

## What you give up

Against the runner-up, Deep Field (49.7, the owner judge's pick):

- **The galaxy on the home page.** Deep Field kept it as a darkened scrim band with the first row of cards floating over its edge, and that was the best version of the nebula anyone proposed. Ledger replaces it with a text masthead and NASA's picture of the day as the lead photograph. You get a different space image every day instead of the same stock nebula; you lose the one personal visual choice on the current site. If you miss it, Deep Field's band can be added later as a dark-mode-only 140px strip above the masthead, as a local AVIF under 60KB with `fetchPriority="high"`, accepting that the mobile LCP becomes an image again (budget ~0.4s). It also fits the CV header if you want it there instead.
- **The layered, rounded, lit-edge look.** Deep Field's 16px radii, three surface levels and inset 1px highlights read as expensive and current. Ledger's 6px radii, single surface and hairlines read as printed and plain. Ledger will look less like a product and more like a page; that is the point, but it is a loss if you like the SaaS register.
- **Space Grotesk.** A display face with a technical, sci-fi flavour that matches the space content literally. Fraunces is a serif; it signals "editorial" rather than "console". Some visitors will find a serif on a data dashboard unexpected.
- **About two days.** Deep Field was scoped at 6 days, Ledger at 8; with two fonts and no Plex Sans this lands at roughly 7. The extra day is mostly the CV ledger layout and the sparkline.
- **The lower-risk refactor.** Both directions convert the grid to server components, but Deep Field kept lucide and the system body font and did less to the CV pages, so it had fewer surfaces to regress.

What you do not give up: dark by default, the Weather and Space cards leading the grid, image-led Space and Photography cards, full-colour game covers and video thumbnails, the freshness stamp on every card, a native dialog, and the same performance work (server-rendered grid, no framer-motion, GTM lazy, tightened `remotePatterns`). Every one of Deep Field's performance steps is in the checklist above.

## Build order

Sequenced so the new look is visible after step 2 and every step leaves the site deployable.

0. **Cron: write `fetchedAt`** into the `meta` singleton from every job (outside `src/`; scripts/push-to-mongo.ts and the Netlify functions only read). Start it in parallel; nothing in the UI blocks on it because of the `LATEST` fallback.
1. **Tokens and shell** (half a day). New `globals.css`, `next/font` imports and the theme script in `layout.tsx`, remove the hero preload and preconnects, GTM to `lazyOnload`, delete `tailwind.config.ts` and the four plugins. Every page immediately takes the new ground, type and colour, even with the old components in place.
2. **Masthead** (half a day). A server component with the dateline, the Sydney time line and a placeholder freshness strip; delete `HeroImage`/`HeroSkeleton`. The page now opens the way it will open when finished. Run Lighthouse here; expect the 60s.
3. **Card shell and Weather** (one day). `Card`, `Kicker`, `Freshness`, `FreshnessTicker` and the server-rendered `WeatherCard` with the 72px numeral, sparkline, hourly row and 7-day table. One finished widget shows the whole grammar; sign off the look on this card before converting the rest.
4. **Grid to server components** (one and a half days). `page.tsx` passes data down; convert the other eight cards; delete the client cache and dynamic imports; `WidgetDialog` island with the native `<dialog>`; remove `framer-motion` and home-route lucide. Run Lighthouse; expect the 80s.
5. **Images and config** (half a day). `sizes` and fixed dimensions on every thumbnail, `mqdefault`, APOD dims and blur in the space cron, `remotePatterns` tightened, inline weather glyphs, cache headers in `netlify.toml`. Run Lighthouse; expect 88+.
6. **Freshness strip and stale states** (half a day). Wire the masthead strip and `<details>` aggregate to `meta`; test a stale card by hand-editing one `fetchedAt`.
7. **About-me** (one and a half days). Header block, rail, `.raster` ledgers, tables, quotes, mono skill list; then the eight subpages through `SectionPageLayout`; the admin form CSS.
8. **QA pass** (half a day). Both themes on a real phone, keyboard-only through the dialog, screen-reader read of a stale stamp, `next build` JS budget, final Lighthouse on the deploy preview, and the GA decision if the score is under 90.

## Appendix: the four proposals in brief

**Ledger (editorial, 50.3).** Treats the site as a set data page from a serious daily: warm paper by default with a warm near-black dark mode, one vermilion accent, Fraunces for the few headlines, IBM Plex Sans body and Plex Mono for every number, hairlines instead of shadows. A text masthead carries a dateline and a strip reporting all nine feed ages; APOD is the daily lead photograph; Weather gets a sparkline and 7-day range bars; the CV becomes a rail-and-measure long-form profile with ledger rows. Freshness is the most complete of the four (meta singleton contract, server `<Freshness>` with per-feed budgets, sub-1KB ticker, stale-first masthead). Flaws the judges named: light-first, three font families (~110KB), and an APOD `priority` LCP. 8 days.

**Deep Field (spaceDark, 49.7).** A quiet observatory console: near-black navy void, three lit surface levels with 1px edges, one solar-gold accent, Space Grotesk titles, JetBrains Mono data, system body. The nebula stays as an art-directed local AVIF band darkened to 40% that dissolves into the page via a scrim, with the Weather and Space cards overlapping its lower edge. Bento grid with Space as the span-8 lead, freshness as a dot-and-mono stamp with live/aging/stale states and a site-wide banner when three or more feeds are stale, native dialog, no framer-motion. Fits the owner most literally and is the cheapest build, but every judge called it the Linear/Raycast layered-dark template with a sky. 6 days.

**Rasterblatt (swiss, 49.3).** Delete the cards, delete the galaxy, let the numbers be the poster: a strict 12-column grid drawn by a 1px gap on a rule-coloured background, one grotesk (Archivo variable, ~45KB, the only font), black on white or white on neutral near-black, and one Swiss red for index numbers, links and the word STALE. The hero is Sydney's temperature at 96px with the 12-hour forecast as a row of figures, so the LCP is a text node that changes hourly. Widgets are tables with absolute-plus-relative stamps; thumbnails are grayscale at rest. The best performance story and the most durable system, but it grayscales the game covers and video thumbs, defaults to white, reuses the accent red for stale, and stacks nine tables into a spreadsheet on a phone. 7 days.

**Contact Sheet (wildcard, 45.0).** The home page as a photographer's contact sheet on warm near-black: nine same-sized numbered frames, an amber film-camera "date back" stamp in Doto dot-matrix digits carrying the fetch time in each frame's corner, a stale feed rendered as an underexposed frame (dashed red border, body at 0.72 opacity), a sheet-header status line (`9 frames · 8 fresh · 1 stale`), and the CV as the prints pulled from the sheet. IBM Plex Sans and Mono plus Doto; Unsplash landscape as the lead frame; light mode as a warm light table. The most original concept and the most characterful freshness treatment, but it sets the site's one hard requirement in a 14px dot-matrix face, makes a remote Unsplash image the `priority` LCP, drops the galaxy for a stock landscape, has the tightest light-mode contrast, is the longest build, and needs every cron writing `fetchedAt` before launch or every frame ships red. 9 days.

## Addendum (2026-09-18): data-drawing micro-animation — owner request

Owner chose **Ledger, night edition** and asked to incorporate the animated-card treatment seen in a LinkedIn infographic ("15 Skills of the AI-Native GTM Engineer", arrel.ai): dark bento cards, each with a kicker, title, subtitle and a small diagram of the concept (sparkline bars, tiered arcs, pipeline nodes, pass/fail toggles, a waveform) that animates in.

**What we adopt**
- *Every card body is a diagram of its own data*, not a list with a thumbnail. This is already Ledger's grammar for Weather; extend it: Games → release dates as dots on a 30-day axis above the covers; Coffee / Drones → `publishedAt` ticks on a horizontal time axis (the infographic's `Day 1 … 14` row); Hacker News → score bars beside rank (requires storing `score` from the Firebase item in the cron — a one-line change when the jobs move to Netlify Scheduled Functions); YouTube → the 3×3 `.raster` grid with a per-channel age tick; Space and Photography stay photo-led; masthead freshness strip → the infographic's `pass / pass / pass` toggle row is exactly the fresh / aging / stale dots.
- *Animation as data-drawing, once, CSS-only.* Inline SVG strokes draw in with `stroke-dasharray` / `stroke-dashoffset` keyframes; bars and range strips grow via `transform: scaleX()` from a `transform-origin: left`; freshness dots fade from `--ink-3` to their state colour. 400–600 ms, `ease-out`, triggered by `animation-timeline: view()` where supported and by the element simply being in the first paint otherwise. Zero JS, zero TBT, no library.

**Rules that keep it inside Ledger's motion policy ("colour moves, nothing else does") and the Lighthouse target**
1. Text never animates and is never hidden at first paint — the LCP element (masthead dateline / temperature numeral) must be painted at full opacity in the first frame. Only the SVG strokes and bars inside a card animate.
2. Nothing loops. One draw per page load; no ambient motion, no pulsing dots, no marquee.
3. No card entrance stagger, no fade-up of the grid, no hover scale — those delay content and are the genre tell the brief avoids.
4. `prefers-reduced-motion: reduce` disables all of it (already covered by the global rule in the token sheet).
5. Chrome does not glow. The infographic's green vignette and gradient card backgrounds are not adopted; cards stay `--surface` with hairline rules. The colourful service-logo clusters become the mono `Source:` footer line, or at most one 12 px monochrome glyph.

**Cost**: half a day inside build-order step 3 (Weather proves it) and step 4 (the rest), no new dependencies. Lighthouse impact expected to be nil; verify on the step-4 run.

**What the source actually does (viewed 2026-09-18).** The LinkedIn media is a looping GIF: inside each card the diagram moves continuously — a radar beam sweeps, the signal bar chart ticks along like a live feed, the warm-up strip fills left to right, the call waveform pulses, dot rows light in sequence, a terminal cursor types. It is ambient, decorative motion built to stop a feed scroll. On a site you open every morning the same loop becomes noise and battery, so the translation is:
- **Draw once on load** (the rules above), then
- **Replay on hover / focus of the card** — re-running the same 400–600 ms draw is the on-demand equivalent of the loop: the card feels alive when you look at it and is still when you don't. Pure CSS (`:hover` / `:focus-within` restarts the keyframes on the SVG), no JS.
- At most **one** ambient element on the whole page, if any: the candidate is the freshness dot in the masthead strip pulsing once when a feed's age ticks over, never a continuous sweep.
