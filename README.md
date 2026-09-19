# nhatminh.dev

Minh Nguyen's personal site: a **Daily Dash** of live feeds (Sydney weather, Hacker News, NASA's picture of the day, new game releases, a daily photograph, coffee news, a verse of the day with questions to reflect on, the latest from nine YouTube channels) and a **CV** with the usual sections. Built with Next.js 15 (App Router), React 19 and Tailwind CSS v4, hosted on Netlify, data in MongoDB Atlas.

The design is documented in [docs/DESIGN-DIRECTION.md](docs/DESIGN-DIRECTION.md) ("Ledger, night edition") and the system in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How it works

```
Netlify Scheduled Functions (cron) ── fetch API → trim → write ─────────▶ MongoDB "cv"
      netlify/functions/feed-*.ts                                         │
Next.js server (Netlify) ── src/lib/dashboard.ts, src/lib/cv.ts ──────────┘  reads directly
      │  ISR, revalidate = 60                                                (MONGODB_URI)
      ▼
Browser ── server-rendered HTML; three small client islands (theme toggle,
           once-a-minute freshness ticker, dialog controller)

Netlify Functions (netlify/functions/) ── the same reads over HTTP, used by
      local development and the admin CSV upload (upload-cv-data)
```

- Pages read MongoDB directly when `MONGODB_URI` is set (production and Netlify builds) and fall back to the deployed functions at `NEXT_PUBLIC_BASE_URL` otherwise (local development).
- Every feed run stamps `singletons/meta.fetchedAt.<feed>`; the dashboard shows each feed's age and marks feeds stale rather than presenting old data as current.
- The CV is written by the admin CSV upload at `/admin/upload` (needs `UPLOAD_SECRET_KEY`).

## Local development

```bash
npm ci
cp .env.example .env      # then edit
npm run dev               # http://localhost:3000, pages fetch data from the live functions
```

With `NEXT_PUBLIC_BASE_URL=https://nhatminh.dev` in `.env`, the dashboard and CV render against production data without a database. To run the functions locally too, install the Netlify CLI, `netlify login`, `netlify link`, then `npm run dev:netlify` (port 8888) — it injects the site's environment variables, including `MONGODB_URI`.

Requires Node 22.12 or newer (`@netlify/functions` 6 asks for it). Netlify builds with the Node named in `.nvmrc` and runs the functions on `nodejs22.x`.

`package.json` carries one `overrides` entry. Next 15.5.x pins `postcss` 8.4.31 exactly, which `npm audit` flags (GHSA-qx2v-qp2m-jg93 and three more), so `next` is pointed at the root `postcss` instead; the compiled CSS is byte-identical with and without it. `next` is held to `~15.5` on purpose: maintenance releases of an old major may arrive as minors "even if they are breaking changes". Delete the override when moving to Next 16, which pins a fixed postcss itself.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run dev:netlify` | Netlify dev: Next.js + functions on :8888 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Unit tests (`node --test`) |

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | Netlify (site + build), GitHub secret | Atlas connection string. Optional locally. |
| `MONGODB_DB` | same | Database name, default `cv` |
| `NEXT_PUBLIC_BASE_URL` | local `.env` | Where pages fetch functions from when there is no `MONGODB_URI`; on Netlify the platform `URL` is used |
| `UPLOAD_SECRET_KEY` | Netlify | Required by `upload-cv-data`; uploads are refused when unset. Also the bearer token for `/api/revalidate` unless `REVALIDATE_SECRET` is set |
| `EBAY_WEBHOOK_VERIFICATION_TOKEN`, `EBAY_WEBHOOK_ENDPOINT` | Netlify | eBay marketplace account-deletion challenge (the endpoint acknowledges notifications and stores nothing) |
| `WEATHER_KEY`, `RAWG_KEY`, `NASA_KEY`, `UNSPLASH_KEY`, `YOUTUBE_KEY` | Netlify (secret) | Feed API keys read by the scheduled functions (coffee and the verse need none; `NEWSAPI_KEY` is no longer read) |
| `FEEDS_VIA_NETLIFY` | Netlify | `true` switches the scheduled feeds on |

## Feeds

Each feed is a **Netlify Scheduled Function** (`netlify/functions/feed-*.ts`, logic in `netlify/functions/feeds/`). It fetches, trims, replaces the stored data and stamps `singletons/meta.fetchedAt.<feed>`, which is where the ages on the dashboard come from. Until 2026-09-19 these were eight GitHub Actions cron workflows; GitHub disables scheduled workflows after 60 days without repository activity, which is how the site once showed year-old data for a year.

| Feed | Function | Schedule (UTC) | Source | Writes |
|---|---|---|---|---|
| weather | `feed-weather` | hourly at :10 | OpenWeather One Call (Sydney) | `singletons/weather` |
| tech | `feed-tech` | every 3 h | Hacker News top 10 (with score) | `tech` |
| space | `feed-space` | 08:00 | NASA APOD, EPIC | `singletons/space`, `singletons/epic` |
| camera | `feed-camera` | 08:00 | Unsplash random landscape | `singletons/photography` |
| youtube | `feed-youtube` | 02:00 | YouTube Data API, 9 channels | `singletons/youtubeRecs` |
| games | `feed-games` | 04:00 | RAWG, last 30 days by rating | `games` |
| coffee | `feed-coffee` | 05:00 | Six coffee papers, read directly — no key (see below) | `coffee` |
| verse | `feed-verse` | 19:00 and 21:00 (05:00 / 07:00 Sydney) | BibleGateway verse of the day, a different translation each day — no key (see below) | `singletons/verse` |

- The functions run only while `FEEDS_VIA_NETLIFY=true` is set on the site. Create environment variables in the Netlify UI (or with all scopes): a variable created through the API with a functions-only scope never reached the functions. A deploy is needed before functions see a new or changed variable.
- To run a feed by hand: Netlify → Logs → Functions → `feed-<name>` → **Run now**. Outside requests to a scheduled function get a 403.
- Pages are cached (ISR, 60 s), and a visit to an expired page gets the old copy while a new one renders behind it; on a quiet site that copy is as old as the previous visit. So after a successful write each feed calls `POST /api/revalidate` (bearer `REVALIDATE_SECRET`, falling back to `UPLOAD_SECRET_KEY`), and the next visitor gets a page rendered from the new data. The CV upload does the same for `/about-me`. This is a page refresh inside the running site, not a Netlify build.
- The coffee card reads specialty-coffee publishers instead of searching the news: Sprudge, Daily Coffee News, Perfect Daily Grind, Barista Magazine, Fresh Cup and BeanScene (`PAPERS` in `feeds/sources.ts`) — each site's WordPress JSON where it has one (it carries a square thumbnail), its RSS otherwise and as the fallback. A title search of NewsAPI matched "Pan-Americano" beach tennis and pumpkin-spice memes; here the publisher is the filter. `src/utils/papers.ts` drops each paper's round-ups and sponsored posts, merges the same story told twice, and keeps 8 items from the last 14 days with at most 2 per paper (1 for BeanScene), different papers first. Only the headline, link, thumbnail URL, date and paper's name are stored. Which papers answered is recorded as `meta.lastRun.coffee.note`.
- The verse card: BibleGateway chooses the verse (the NET Bible's verse of the day stands in if it cannot be reached), and the translation rotates by Sydney's date — NIV, KJV, ESV, NLT, BSB (`TRANSLATIONS` in `feeds/sources.ts`). The first four are the ones BibleGateway's documented verse-of-the-day service serves; its JSON endpoint also answers for versions that service refuses "due to copyright issues", so nothing else is taken from it. BSB is public domain and is read from bible.helloao.org by reference. Each translation's notice is the publisher's own wording and is shown in the dialog with "Powered by BibleGateway.com"; one document is replaced whole each day, so no archive of copyrighted text builds up. The four questions under the verse are a fixed set per reading method (`src/utils/reflection.ts`), rotated daily and stored with the verse. `meta.lastRun.verse.note` records the reference, the translation that actually arrived and the method.
- Every run records itself in `singletons/meta.lastRun.<feed>` (`at`, `ok`, `ms`, the page `refresh` result, a feed's own `note`, and the `error` without any URL), so a failing feed can be diagnosed from the data; the full log stays in Netlify for 24 hours.
- A failed feed leaves the previous data in place, an empty upstream result is treated as a failure, and new items are inserted before old ones are removed, so a page render never sees an empty list. Scheduled functions get 30 s: 8 s to reach MongoDB and 8 s per upstream request.

## Deploy

Push to `main`. Netlify builds with `next build` (fonts are self-hosted through `next/font` and downloaded at build time), deploys the functions in `netlify/functions/`, and reports a Lighthouse score on each deploy.

To undo a bad deploy: Netlify → Deploys → the last good production deploy → **Publish deploy**. It is instant, does not rebuild and costs no credits. The next push to `main` publishes over it again unless **Lock to stop auto publishing** is on.
