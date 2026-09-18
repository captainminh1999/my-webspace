# nhatminh.dev

Minh Nguyen's personal site: a **Daily Dash** of live feeds (Sydney weather, Hacker News, NASA's picture of the day, new game releases, a daily photograph, coffee and drone news, the latest from nine YouTube channels) and a **CV** with the usual sections. Built with Next.js 15 (App Router), React 19 and Tailwind CSS v4, hosted on Netlify, data in MongoDB Atlas.

The design is documented in [docs/DESIGN-DIRECTION.md](docs/DESIGN-DIRECTION.md) ("Ledger, night edition") and the system in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How it works

```
GitHub Actions (cron) ──curl API → jq/node → scripts/push-to-mongo.ts──▶ MongoDB "cv"
                                                                          │
Next.js server (Netlify) ── src/lib/dashboard.ts, src/lib/cv.ts ──────────┘  reads directly
      │  ISR, revalidate = 60                                                (MONGODB_URI)
      ▼
Browser ── server-rendered HTML; three small client islands (theme toggle,
           once-a-minute freshness ticker, dialog controller)

Netlify Functions (netlify/functions/) ── the same reads over HTTP, used by
      local development and the admin CSV upload (upload-cv-data)
```

- Pages read MongoDB directly when `MONGODB_URI` is set (production and Netlify builds) and fall back to the deployed functions at `NEXT_PUBLIC_BASE_URL` otherwise (local development).
- Every feed job stamps `singletons/meta.fetchedAt.<feed>`; the dashboard shows each feed's age and marks feeds stale rather than presenting old data as current.
- The CV is written by the admin CSV upload at `/admin/upload` (needs `UPLOAD_SECRET_KEY`).

## Local development

```bash
npm ci
cp .env.example .env      # then edit
npm run dev               # http://localhost:3000, pages fetch data from the live functions
```

With `NEXT_PUBLIC_BASE_URL=https://nhatminh.dev` in `.env`, the dashboard and CV render against production data without a database. To run the functions locally too, install the Netlify CLI, `netlify login`, `netlify link`, then `npm run dev:netlify` (port 8888) — it injects the site's environment variables, including `MONGODB_URI`.

Requires Node 22 (Netlify runs the functions on `nodejs22.x`).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run dev:netlify` | Netlify dev: Next.js + functions on :8888 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Unit tests (`node --test`) |
| `npm run push-to-mongo -- --file x.json --singleton weather` | Write a JSON file to a singleton or a collection; `--meta <feed>` stamps the fetch time |

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | Netlify (site + build), GitHub secret | Atlas connection string. Optional locally. |
| `MONGODB_DB` | same | Database name, default `cv` |
| `NEXT_PUBLIC_BASE_URL` | local `.env` | Where pages fetch functions from when there is no `MONGODB_URI`; on Netlify the platform `URL` is used |
| `UPLOAD_SECRET_KEY` | Netlify | Required by `upload-cv-data`; uploads are refused when unset |
| `EBAY_WEBHOOK_VERIFICATION_TOKEN`, `EBAY_WEBHOOK_ENDPOINT` | Netlify | eBay marketplace account-deletion challenge (the endpoint acknowledges notifications and stores nothing) |
| `WEATHER_KEY`, `NEWSAPI_KEY`, `RAWG_KEY`, `NASA_KEY`, `UNSPLASH_KEY`, `YOUTUBE_KEY` | Netlify (secret) | Feed API keys read by the scheduled functions; the last three are still GitHub secrets too while their workflows exist |
| `FEEDS_VIA_NETLIFY` | Netlify | `true` switches the scheduled feeds on |

## Feeds

Each feed is a **Netlify Scheduled Function** (`netlify/functions/feed-*.ts`, logic in `netlify/functions/feeds/`). It fetches, trims, replaces the stored data and stamps `singletons/meta.fetchedAt.<feed>`, which is where the ages on the dashboard come from.

| Feed | Function | Schedule (UTC) | Source | Writes | GitHub workflow |
|---|---|---|---|---|---|
| weather | `feed-weather` | hourly at :10 | OpenWeather One Call (Sydney) | `singletons/weather` | removed 2026-09-19 |
| space | `feed-space` | 08:00 | NASA APOD, EPIC | `singletons/space`, `singletons/epic` | removed 2026-09-19 |
| games | `feed-games` | 04:00 | RAWG, last 30 days by rating | `games` | removed 2026-09-19 |
| tech | `feed-tech` | every 3 h | Hacker News top 10 (with score) | `tech` | `fetch-tech.yml`, until the first Netlify run is confirmed |
| camera | `feed-camera` | 08:00 | Unsplash random landscape | `singletons/photography` | `fetch-photography.yml`, until `UNSPLASH_KEY` is on Netlify |
| youtube | `feed-youtube` | 02:00 | YouTube Data API, 9 channels | `singletons/youtubeRecs` | `fetch-youtube-recs.yml`, until `YOUTUBE_KEY` is on Netlify |
| coffee | `feed-coffee` | 05:00 | NewsAPI | `coffee` | `fetch-coffee-news.yml`, until `NEWSAPI_KEY` is on Netlify |
| drones | `feed-drones` | 06:00 | NewsAPI | `droneNews` | `fetch-drone-news.yml`, until `NEWSAPI_KEY` is on Netlify |

- The functions run only while `FEEDS_VIA_NETLIFY=true` is set on the site. Create environment variables in the Netlify UI (or with all scopes): a variable created through the API with a functions-only scope never reached the functions. A deploy is needed before functions see a new or changed variable.
- To run a feed by hand: Netlify → Logs → Functions → `feed-<name>` → **Run now**. Outside requests to a scheduled function get a 403.
- Every run records itself in `singletons/meta.lastRun.<feed>` (`at`, `ok`, `ms`, and the `error` without any URL), so a failing feed can be diagnosed from the data; the full log stays in Netlify for 24 hours.
- A failed feed leaves the previous data in place, an empty upstream result is treated as a failure, and new items are inserted before old ones are removed, so a page render never sees an empty list. Scheduled functions get 30 s: 8 s to reach MongoDB and 8 s per upstream request.
- The remaining workflows run the same fetches through `scripts/push-to-mongo.ts`. GitHub disables scheduled workflows after 60 days without repository activity, which is how the site once showed year-old data; delete each workflow as soon as its Netlify feed has run once, and the script with the last of them.

## Deploy

Push to `main`. Netlify builds with `next build` (fonts are self-hosted through `next/font` and downloaded at build time), deploys the functions in `netlify/functions/`, and reports a Lighthouse score on each deploy.
