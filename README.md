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
Edge function (netlify/edge-functions/csp.ts) ── in front of the CDN cache: a fresh
      │  nonce on every HTML page and the Content-Security-Policy that names it
      ▼
Browser ── server-rendered HTML; four small client islands (theme toggle,
           once-a-minute freshness ticker, dialog controller, Google Analytics)

Netlify Functions (netlify/functions/) ── the same reads over HTTP, used by
      local development

Admin ── /admin/upload → POST /api/admin/* (Next route handlers, src/lib/admin/):
      passkey sign-in, then the CSV upload ── writes ─▶ MongoDB, revalidatePath
```

- Pages read MongoDB directly when `MONGODB_URI` is set (production and Netlify builds) and fall back to the deployed functions at `NEXT_PUBLIC_BASE_URL` otherwise (local development).
- Every feed run stamps `singletons/meta.fetchedAt.<feed>`; the dashboard shows each feed's age and marks feeds stale rather than presenting old data as current.
- The CV is written by the admin CSV upload at `/admin/upload`, behind a passkey (see [Admin sign-in](#admin-sign-in)).
- Every page carries a nonce-based Content-Security-Policy, added at Netlify's edge so the pages stay cached (see [Content-Security-Policy](#content-security-policy)).

## Local development

```bash
npm ci
cp .env.example .env      # then edit
npm run dev               # http://localhost:3000, pages fetch data from the live functions
```

With `NEXT_PUBLIC_BASE_URL=https://nhatminh.dev` in `.env`, the dashboard and CV render against production data without a database. To run the functions locally too, install the Netlify CLI, `netlify login`, `netlify link`, then `npm run dev:netlify` (port 8888) — it injects the site's environment variables, including `MONGODB_URI`.

The admin (`/admin/upload`) is the one page that needs `MONGODB_URI` locally — passkeys and sessions live in the database; without it the page says "Admin is unavailable". Open it as `http://localhost:3000` (or `:3001`, `:8888`), not `http://127.0.0.1:…`: a passkey is bound to the host name, and the page tells you when you are on the wrong one. Set `MONGODB_DB=cv_dev` so local uploads and local passkeys stay out of the live data. A local upload never pings production's `/api/revalidate`.

With `MONGODB_URI` set, every page reads that database too — not the live functions any more. Under `cv_dev` the local dashboard and CV are therefore empty until you upload into it; nothing is broken. To see real data locally set `MONGODB_DB` back to `cv` and enrol once more: the passkey then lives in `cv` under rpId `localhost`, and local uploads write the live data.

Requires Node 22.12 or newer (`@netlify/functions` 6 asks for it). Netlify builds with the Node named in `.nvmrc` and runs the functions on `nodejs22.x`.

`package.json` carries one `overrides` entry. Next 15.5.x pins `postcss` 8.4.31 exactly, which `npm audit` flags (GHSA-qx2v-qp2m-jg93 and three more), so `next` is pointed at the root `postcss` instead; the compiled CSS is byte-identical with and without it. `next` is held to `~15.5` on purpose: maintenance releases of an old major may arrive as minors "even if they are breaking changes". Delete the override when moving to Next 16, which pins a fixed postcss itself.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run dev:netlify` | Netlify dev: Next.js + functions on :8888 |
| `npm run serve:netlify` | Netlify dev in front of `next start` (the production build) on :8888 — the local Content-Security-Policy proof. Needs `npm run build` first and port 3000 free |
| `npm run verify:csp -- <origin>` | Checks the policy and the nonces an origin sends (`scripts/verify-csp.mjs`); `--poison` adds the cache-poisoning check |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next.js config) |
| `npm run typecheck` | TypeScript, the site and then `netlify/` (functions and the edge function) |
| `npm test` | Unit tests (`node --test`) |

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | Netlify (site + build), GitHub secret | Atlas connection string. Optional locally. |
| `MONGODB_DB` | same | Database name, default `cv`. Locally, `cv_dev` keeps local uploads and local passkeys out of the live data |
| `NEXT_PUBLIC_BASE_URL` | local `.env` | Where pages fetch functions from when there is no `MONGODB_URI`; on Netlify the platform `URL` is used |
| `UPLOAD_SECRET_KEY` | Netlify; a different value in local `.env` | Enrolment and recovery secret for the admin passkeys. Asked for once, while no passkey exists for the host; enrolment is refused when it is unset or shorter than 16 characters. It no longer authorises uploads. Production's value never goes into `.env` |
| `REVALIDATE_SECRET` | Netlify | Bearer for `POST /api/revalidate` (the scheduled feeds). Falls back to `UPLOAD_SECRET_KEY` when unset — give it its own value |
| `EBAY_WEBHOOK_VERIFICATION_TOKEN`, `EBAY_WEBHOOK_ENDPOINT` | Netlify | eBay marketplace account-deletion challenge (the endpoint acknowledges notifications and stores nothing) |
| `WEATHER_KEY`, `RAWG_KEY`, `NASA_KEY`, `UNSPLASH_KEY`, `YOUTUBE_KEY` | Netlify (secret) | Feed API keys read by the scheduled functions (coffee and the verse need none; `NEWSAPI_KEY` is no longer read) |
| `FEEDS_VIA_NETLIFY` | Netlify | `true` switches the scheduled feeds on |
| `CSP_MODE` | normally unset | The Content-Security-Policy switch read by the edge function. On Netlify unset means enforce; `off` (scope including Functions, then a deploy) turns the policy off and leaves the baseline. Locally only ever in the throwaway `.env.development.local`, never in `.env` (see [Content-Security-Policy](#content-security-policy)) |

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
- Pages are cached (ISR, 60 s), and a visit to an expired page gets the old copy while a new one renders behind it; on a quiet site that copy is as old as the previous visit. So after a successful write each feed calls `POST /api/revalidate` (bearer `REVALIDATE_SECRET`, falling back to `UPLOAD_SECRET_KEY`), and the next visitor gets a page rendered from the new data. The CV upload runs inside Next and calls `revalidatePath` itself (`/about-me` and everything under it, plus `/` after a profile upload). This is a page refresh inside the running site, not a Netlify build.
- The coffee card reads specialty-coffee publishers instead of searching the news: Sprudge, Daily Coffee News, Perfect Daily Grind, Barista Magazine, Fresh Cup and BeanScene (`PAPERS` in `feeds/sources.ts`) — each site's WordPress JSON where it has one (it carries a square thumbnail), its RSS otherwise and as the fallback. A title search of NewsAPI matched "Pan-Americano" beach tennis and pumpkin-spice memes; here the publisher is the filter. `src/utils/papers.ts` drops each paper's round-ups and sponsored posts, merges the same story told twice, and keeps 8 items from the last 14 days with at most 2 per paper (1 for BeanScene), different papers first. Only the headline, link, thumbnail URL, date and paper's name are stored. Which papers answered is recorded as `meta.lastRun.coffee.note`.
- The verse card: BibleGateway chooses the verse (the NET Bible's verse of the day stands in if it cannot be reached), and the translation rotates by Sydney's date — NIV, KJV, ESV, NLT, BSB (`TRANSLATIONS` in `feeds/sources.ts`). The first four are the ones BibleGateway's documented verse-of-the-day service serves; its JSON endpoint also answers for versions that service refuses "due to copyright issues", so nothing else is taken from it. BSB is public domain and is read from bible.helloao.org by reference. Each translation's notice is the publisher's own wording and is shown in the dialog with "Powered by BibleGateway.com"; one document is replaced whole each day, so no archive of copyrighted text builds up. The four questions under the verse are a fixed set per reading method (`src/utils/reflection.ts`), rotated daily and stored with the verse. `meta.lastRun.verse.note` records the reference, the translation that actually arrived and the method.
- Every run records itself in `singletons/meta.lastRun.<feed>` (`at`, `ok`, `ms`, the page `refresh` result, a feed's own `note`, and the `error` without any URL), so a failing feed can be diagnosed from the data; the full log stays in Netlify for 24 hours.
- A failed feed leaves the previous data in place, an empty upstream result is treated as a failure, and new items are inserted before old ones are removed, so a page render never sees an empty list. Scheduled functions get 30 s: 8 s to reach MongoDB and 8 s per upstream request.

## Admin sign-in

`/admin/upload` is behind a passkey (WebAuthn, `@simplewebauthn` 14; code and tests in `src/lib/admin/`). The server decides what the page shows: enrolment, sign-in, or the upload form. A session is a 12-hour `HttpOnly`, `SameSite=Strict` cookie and lives only as long as the passkey that opened it. Because of `SameSite=Strict`, arriving from a link on another site shows the sign-in panel once; a reload fixes it.

The host a passkey belongs to is fixed when the bundle is built: `next dev` means `localhost`, every `next build` means `nhatminh.dev` — whatever `NODE_ENV` or the Host header say at run time. So the admin works on `https://nhatminh.dev` (the apex — not `www`, not `*.netlify.app`, not a deploy preview) and on `http://localhost:3000` / `:3001` / `:8888` under `npm run dev`. Anywhere else the page says where to go instead.

- **Before anything (once):** a new Atlas database user with `readWrite` on `cv` and `cv_dev` only; on Netlify (all scopes, all contexts) `MONGODB_URI` for that user, a new random `UPLOAD_SECRET_KEY` of 32+ characters (`openssl rand -base64 32`, password manager only) and another one for `REVALIDATE_SECRET`. Local `.env`: the new `MONGODB_URI`, a *different* random `UPLOAD_SECRET_KEY` that is only for localhost, and `MONGODB_DB=cv_dev`. Keep the old `MONGODB_URI` in the password manager until a week after the old user is deleted.
- **First enrolment, local:** `npm run dev` → `http://localhost:3000/admin/upload` (`:3001` when started from the launch config) → the secret from `.env` → **Create passkey** → Touch ID. Do this first: it locks the `localhost` host.
- **First enrolment, production:** the moment the deploy is live, open `https://nhatminh.dev/admin/upload`, paste the secret from the password manager, create the passkey. The page must now list exactly one passkey, created just now. If instead you see **Sign in with passkey** before you enrolled, someone else won: delete every `nhatminh.dev` document in `cv.admin_credentials` (their session dies with it), rotate the secret, redeploy, enrol again.
- **Second device:** signed in → **Add another passkey**, within 5 minutes of signing in (later than that: sign out, sign in again — a session that old may upload, but a passkey outlives it, so a copied cookie must not be able to make one). A synced passkey already follows you; add one for another ecosystem or a hardware key. From a phone: "use a phone or tablet" → QR code.
- **Every device lost:** Atlas → `admin_credentials` → delete the documents of that `rpId` → the page offers enrolment again → the secret. No deploy.
- **Kill switches:** delete a credential document → that passkey and every session it opened are dead (the list on the page shows label and creation time in UTC, the way Atlas does, so the right document can be found). Delete everything in `admin_sessions` → every browser is signed out, passkeys stay.
- **After the old database user is deleted** (the last step of the rollout, once production enrolment works and `npm run verify:csp -- https://nhatminh.dev` has passed — until then the [Content-Security-Policy brake](#rollout-brake-repair-and-the-standing-check) still needs the previous deploy to be servable): every deploy older than the passkey one can no longer read or write — each of them still carries the old upload function and the old secret, which is the point. Never **Publish deploy** on one of them: pages do not throw without a database, so it would serve an empty site. *Emergency rollback:* re-create the old Atlas user with the old password (password manager), publish the old deploy, fix forward, delete the user again.
- **If the secret leaks:** while a passkey exists it opens nothing; rotate it at the next deploy.

## Content-Security-Policy

Every page goes out with a nonce-based policy: only script that was in the server's HTML, or was loaded by it, runs. (The one HTML document that does not: Next's 404 for an unknown URL *under* `/api/`, `/_next/` or `/.netlify/`, which the edge function never sees — it carries the baseline only. docs/ARCHITECTURE.md § 14d.) The trade-off, in one paragraph:

> Next.js can only put a nonce into a page it renders fresh for every visitor, and that would throw away the caching that took the site from 49 to 87 — every view would go to a US Lambda and MongoDB. So the nonce is added at Netlify's edge instead, to the cached page, on its way out. React already escapes what it renders and defuses `javascript:` links, so this policy is the second lock, not the first: if something ever gets past React — a careless `dangerouslySetInnerHTML`, a dependency that writes markup in the browser, a script host nobody chose — the browser refuses to run it, refuses `eval`, refuses a planted `<base>`. The one thing it cannot refuse is a `<script>` tag my own server rendered, because the edge cannot tell mine from a forged one; a unit test fails if raw-HTML rendering ever appears outside the constant theme script. One notch below the official approach, at no cost in speed.

How it is put together (the policy itself, directive by directive, is commented in `src/lib/csp.ts`; the longer account is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) § 14):

- **`src/lib/csp.ts`** holds the policy text, the nonce-less `BASELINE_POLICY`, and a small streaming scanner. The scanner puts this response's nonce on every `<script>`, `<style>` and script preload, and removes any nonce that arrived with the HTML: Next.js copies a nonce out of a `Content-Security-Policy` *request* header into the page it renders, an ISR page rendered for one request is cached for everyone, and a tag with a foreign nonce — or with two — does not run. No imports, so it runs in Deno (the edge) and in Node (23 unit tests in `src/lib/__tests__/csp.test.ts`, one of which fails if `dangerouslySetInnerHTML` appears anywhere but `layout.tsx`). It reads tags the way a browser's tokenizer does — HTML's five whitespace characters rather than `\s`, quotes only where a value starts, comments and raw-text elements ending where a browser ends them — so that it can never hand the nonce to something the browser would have left inert; eleven of the tests are those cases.
- **`netlify/edge-functions/csp.ts`** runs in front of the CDN cache on every page request, whatever the method (`POST /` renders the page too). The cached ISR page stays cached; only the nonce is new. It stays out of `/_next/*`, `/.netlify/*` and `/api/*` — so the passkey endpoints' JSON and their `Set-Cookie` never pass through it — and out of client-side navigation (`RSC: 1` requests). It drops `ETag` and `Last-Modified`: a 304 next to a new nonce would make the browser block its own cached copy.
- **The baseline** — `object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` — is sent by `next.config.ts` on every Next response and by `netlify.toml` on static files. It is what a page carries when the edge function is off or bypassed, and what `npm run dev` serves. The edge function replaces it.
- **Google Analytics** is a client island (`src/components/Analytics.tsx`): no inline snippet, `gtag.js` added by bundled code, which `'strict-dynamic'` trusts. It does not load on `/admin/*`.
- **The inline theme script** in `layout.tsx` has no nonce in the source on purpose; it gets one at the edge like every other script and still runs before first paint.
- **Next.js must stay at 15.5.16 or newer.** Before that, the nonce taken from the request header could carry quotes into the cached page (GHSA-ffhc-5mcf-pf4q).
- **Cost.** One edge invocation per request outside `/_next/*`, `/.netlify/*`, `/api/*` and flight requests — pages, plus `favicon.ico` and the files in `public/`; not build assets, images, prefetches or navigations — billed as a web request; no compute. The pass over the 348 KB home page takes 3–8 ms of CPU against Netlify's limit of 50 ms per request — about six times the headroom. If `/` ever doubles in size, measure again. If the function throws, `onError: "bypass"` serves the page with the baseline instead of an error page, and tells nobody — which is what the standing check below is for.

### Proving it locally

The gate before any push. `npm run dev` never passes through the edge function, and under `npm run dev:netlify` the policy is off (hot reloading needs `eval`), so the proof runs the production build behind `netlify dev`:

```bash
npm test && npm run typecheck && npm run lint
npm run build                 # not while `npm run dev` is up: both write .next/

netlify build --offline       # optional: Netlify's own bundler, works unlinked. Expect "Packaging Edge Functions … - csp"
                              # and .netlify/edge-functions-dist/manifest.json with rsc "missing", on_error "bypass", no methods.
                              # Writes only to .next/ and .netlify/ (both git-ignored).

echo 'CSP_MODE=enforce' > .env.development.local     # throwaway switch, git-ignored by `.env*`. NOT the real .env
npm run serve:netlify                                # http://localhost:8888, `next start` behind it on :3000
# second shell:
npm run verify:csp -- http://localhost:8888 --poison # about 75 s. Expect "all checks passed"
# the browser half (below), then:
rm .env.development.local                            # verify:csp prints a reminder while it exists
```

Expect in the `netlify dev` log: "Injected .env.development.local file env vars: CSP_MODE" and "Loaded edge function csp".

`verify:csp` reads headers and HTML. For `/`, `/about-me`, `/about-me/experience`, `/admin/upload` and a 404 it wants: an enforcing header with a nonce and `'strict-dynamic'`, no `'unsafe-eval'`, no Report-Only header; every script, style and script-preload tag carrying exactly one nonce, the header's; no nonce on any other tag; no inline event handlers; a different nonce on a second request; no ETag (or no 304 if there is one); on https, a `content-encoding`. `/admin/upload` must still say `no-store` and `noindex`. Then: `POST /` passes the same page checks; an `RSC: 1` request stays `text/x-component` without a nonce; `/favicon.ico` and `/api/revalidate` are left alone; and a `POST /api/admin/login/options` comes back as the route's own JSON with its own headers and no nonce — a 415 everywhere, because the probe sends the one `Origin` every build accepts with a `Content-Type` none does, and is refused before the body or the database is looked at (nothing is written, on the live site either). With `--poison` it plants a nonce in two ISR pages the two ways a stranger could — a plain request and a flight request — waits for them to go stale, and runs the page checks on what the next visitor gets. It refuses `--poison` for anything but `localhost` and `deploy-preview-<n>--…` hostnames (the live deploy also answers on its `netlify.app` names). Three things `netlify dev` does differently from Netlify — it swallows 403/404 answers, re-applies `netlify.toml` headers, and leaves a stale `content-encoding` on two unused SVGs in `public/` — are listed in docs/ARCHITECTURE.md § 14b; none of them makes the local run lie about the policy.

The browser half, in a clean profile (extensions log violations of their own), on `/`, one `/about-me/*` page and `/admin/upload`:

- no console message containing "Content Security Policy"; `document.documentElement.dataset.theme` is set; the page is hydrated; clicking a link navigates without a violation;
- on public pages `performance.getEntriesByType('resource')` lists `gtag/js` and a `google-analytics.com/g/collect` hit (real hits, hostname `localhost`); on `/admin/upload` no request to Google and no `window.dataLayer`;
- on `/admin/upload`, one passkey sign-in with zero violations (WebAuthn is a Permissions-Policy matter, not a CSP one, but the client code should be seen to run). Locally that needs `MONGODB_URI`, and a production build only accepts passkeys for `https://nhatminh.dev` — so the ceremony itself is proven on the live site; locally the page must render and hydrate;
- negative tests fire a violation and do nothing: an `<img onerror>` set through `innerHTML`, an injected `<style>`, an injected `<base>`, `setTimeout(() => eval('1'))`.

### Rollout, brake, repair and the standing check

1. **Local gate**, above.
2. **Deploy Preview — free.** Open a PR and run `npm run verify:csp -- https://deploy-preview-<n>--morning-kafes-2604.netlify.app --poison`. The compression check and the ETag/304 check only mean something here, and the two `--` lines say whether Netlify lets the poisoned request header reach the ISR render. Then the browser half in Chrome and Safari (the admin page says "Admin works only on https://nhatminh.dev" on a preview — expected), the build log listing `csp` under edge functions, `cache-status` still reporting a hit on a second `curl -sI`, and the speed bar: preview TTFB median within 0.1 s of production and Lighthouse mobile performance at 84 or better (commands in docs/ARCHITECTURE.md § 14). If it misses, do not merge. The Netlify Drawer on previews may log violations of its own.
3. **Production: enforced from the first deploy.** The CSP commit is the last commit of the push that carries it, so that the repair can be one revert.
4. **Straight after every production deploy:** `npm run verify:csp -- https://nhatminh.dev` (about 15 requests, no `--poison`).
5. **Brake** — something is broken for visitors: Netlify → Deploys → the previous deploy → **Publish deploy**. Instant and free. It rolls back *everything* in that deploy, not just the policy, and it does not lock publishing: the next push goes live again.
   **The brake and the passkey rollout meet here.** The policy and the passkeys ship in the same deploy, so unless another deploy was made after the rotation, "the previous deploy" still carries the old database user. While that Atlas user exists the old deploy works — and brings back the old upload function with the old secret, so repair soon. Once the old user is deleted, a deploy from before the rotation reads nothing and serves an **empty site**: pages do not throw without a database (see the last-but-one point of [Admin sign-in](#admin-sign-in)). So delete the old Atlas user only after step 4 has passed on production, and from then on only ever publish a deploy made after the rotation. If there is none to go back to, skip the brake and repair.
6. **Repair** — one production deploy, 15 credits, either:
   - Netlify → Environment variables → `CSP_MODE=off` (scope including Functions) → Trigger deploy. No git; passkeys and everything else are live again, the policy is off and the baseline stays. Fix forward on free previews, then delete the variable with the fixing push. **The default.**
   - or `git revert <the CSP commit>` and push — the reason it is the last commit.
7. **Standing check:** the command of step 4 on the first of each month, and after any Next.js bump (after a bump also `npm test` and the local proof — a new tag type from Next shows up as "tag without the header's nonce"). It is the only thing that notices a silent bypass: the CPU limit, a platform change, a function that started throwing.

## Deploy

Push to `main`. Netlify builds with `next build` (fonts are self-hosted through `next/font` and downloaded at build time), deploys the functions in `netlify/functions/` and the edge function in `netlify/edge-functions/`, and reports a Lighthouse score on each deploy. Straight after, run `npm run verify:csp -- https://nhatminh.dev` (see [Content-Security-Policy](#rollout-brake-repair-and-the-standing-check)).

To undo a bad deploy: Netlify → Deploys → the last good production deploy → **Publish deploy**. It is instant, does not rebuild and costs no credits. Not to a deploy from before the database user was rotated, though — see the last-but-one point of [Admin sign-in](#admin-sign-in). The next push to `main` publishes over it again unless **Lock to stop auto publishing** is on.
