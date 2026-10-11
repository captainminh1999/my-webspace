// After a write, tell the site that its cached pages are out of date (see
// src/app/api/revalidate/route.ts), then render the home page once from here. Never throws
// and never fails the caller: without it the page still catches up through its 60 s ISR
// window, one visit late.
//
// Why the second step: the revalidation purges "/" from Netlify's CDN, so whoever asks for
// it next waits for a full render on a server function that is usually cold — about 3 s
// to start, a new MongoDB connection from us-east-1 to Sydney, and the render. Before this
// step that was the next visitor, up to 10 s after an hourly feed run. Now it is this
// function, and the visitor gets the new page from the CDN.

export interface Warm {
  /** Text only a page rendered after this write contains: the feed's meta.fetchedAt stamp, which the masthead prints. */
  expect: string;
  /** Epoch ms to give up by: scheduled functions get 30 s in all. */
  deadline: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A plain navigation, as the CDN files it (netlify-vary from the Next.js runtime): no cookie,
// no query and none of the RSC / Next-Router headers, each of which addresses another copy.
// Accept-Encoding may be part of the key too, so the page is asked for with Safari's value
// (Node can decode it: this is the copy that is checked) and then once with the value of
// Chrome and Firefox, whose zstd Node 22 cannot decode (that copy is only fetched).
const NAVIGATION = { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" };
const SAFARI = "gzip, deflate, br";
const CHROME = "gzip, deflate, br, zstd";

// The purge is sent in the background after /api/revalidate has answered, so a page asked for
// at once can still be the old copy, and a purge that lands late can delete the copy a render
// just stored. Success therefore needs the new page from the CDN, this long after the POST.
const FIRST_LOOK = 2_000;
const SETTLE = 5_000;

const cacheStatus = (res: Response) => (res.headers.get("cache-status") ?? "").replace(/\s+/g, " ");

async function warmHome(base: string, { expect, deadline }: Warm, postedAt: number): Promise<string> {
  const seen: string[] = [];
  const report = (outcome: string) => `${outcome}: ${seen.join(" | ")}`.slice(0, 800);
  if (Date.now() + FIRST_LOOK + 1_000 >= deadline) return "warm skipped: no time left";
  await sleep(FIRST_LOOK);
  while (Date.now() + 1_000 < deadline) {
    const asked = Date.now();
    let fresh = false;
    let status = "";
    try {
      const res = await fetch(`${base}/`, {
        headers: { ...NAVIGATION, "accept-encoding": SAFARI },
        signal: AbortSignal.timeout(Math.min(12_000, deadline - asked)),
      });
      fresh = res.ok && (await res.text()).includes(expect);
      status = cacheStatus(res);
      seen.push(`${fresh ? "new" : "old"} ${res.status} ${Date.now() - asked}ms ${status}`);
    } catch (err) {
      seen.push(`${err instanceof Error ? err.name : "failed"} ${Date.now() - asked}ms`);
    }
    // A "Next.js" entry means the server function answered (it rendered, or read its own store), not the CDN.
    if (fresh && !status.includes('"Next.js"') && Date.now() - postedAt >= SETTLE) {
      try {
        const res = await fetch(`${base}/`, {
          headers: { ...NAVIGATION, "accept-encoding": CHROME },
          signal: AbortSignal.timeout(Math.max(1_000, Math.min(8_000, deadline - Date.now()))),
        });
        await res.arrayBuffer();
        seen.push(`zstd ${res.status} ${cacheStatus(res)}`);
      } catch (err) {
        seen.push(`zstd ${err instanceof Error ? err.name : "failed"}`);
      }
      return report("warm ok");
    }
    const wait = fresh ? Math.max(1_000, postedAt + SETTLE - Date.now()) : 1_500;
    if (Date.now() + wait + 1_000 >= deadline) break;
    await sleep(wait);
  }
  return report("warm unconfirmed");
}

export async function refreshPages(scope: "home" | "cv", warm?: Warm): Promise<string> {
  const base = process.env.URL || "https://nhatminh.dev";
  const secret = process.env.REVALIDATE_SECRET || process.env.UPLOAD_SECRET_KEY;
  if (!secret) return "skipped: no secret";
  let postedAt: number;
  try {
    const res = await fetch(`${base}/api/revalidate?scope=${scope}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8_000),
    });
    postedAt = Date.now();
    if (!res.ok) return `http ${res.status}`;
  } catch (err) {
    return err instanceof Error ? err.name : "failed";
  }
  if (scope !== "home" || !warm) return "ok";
  try {
    return `ok; ${await warmHome(base, warm, postedAt)}`;
  } catch (err) {
    return `ok; warm ${err instanceof Error ? err.name : "failed"}`;
  }
}
