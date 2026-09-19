// Checks what the CSP edge function sends, against any origin that runs it:
//
//   node scripts/verify-csp.mjs http://localhost:8888            (netlify dev in front of `next start`)
//   node scripts/verify-csp.mjs http://localhost:8888 --poison   (adds the cache-poisoning check, ~75 s)
//   node scripts/verify-csp.mjs https://deploy-preview-123--morning-kafes-2604.netlify.app --poison
//   node scripts/verify-csp.mjs https://nhatminh.dev             (after every production deploy)
//
// It reads headers and HTML only. Whether a browser then reports zero violations
// is the second half of the proof — see docs/ARCHITECTURE.md § Content-Security-Policy.
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const origin = (args.find((a) => !a.startsWith("--")) ?? "").replace(/\/$/, "");
const poison = args.includes("--poison");
if (!origin) {
  console.error("usage: node scripts/verify-csp.mjs <origin> [--poison]");
  process.exit(2);
}
const { hostname, protocol } = new URL(origin);
const local = hostname === "localhost";
// The poison check plants a marker in the ISR cache. The edge function makes that
// harmless, but the live site is not where to find out that it did not. A list of
// what is allowed, not of what is not: the production deploy also answers on
// morning-kafes-2604.netlify.app and main--…, and the cache belongs to the deploy,
// not to the hostname.
if (poison && !local && !/^deploy-preview-\d+--/.test(hostname)) {
  console.error("--poison is for localhost and deploy previews (deploy-preview-<n>--…), not the live site or its netlify.app names");
  process.exit(2);
}

const PAGES = ["/", "/about-me", "/about-me/experience", "/admin/upload", "/this-page-does-not-exist"];
let failures = 0;
const check = (ok, what) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${what}`);
};
const note = (what) => console.log(`  --   ${what}`);
const nonceOf = (policy) => /'nonce-([^']+)'/.exec(policy ?? "")?.[1];
// Attributes the way the HTML tokenizer reads them, one after the other from the tag
// name on (same expression as src/lib/csp.ts; HTML's five whitespace characters, not
// \s), so the word "nonce" inside a headline's alt text is not mistaken for one.
const ATTRIBUTE = /[\t\n\f\r /]*([^\t\n\f\r />][^\t\n\f\r />=]*)(?:[\t\n\f\r ]*=[\t\n\f\r ]*(?:"([^"]*)"|'([^']*)'|([^\t\n\f\r >]*)))?/gy;
const noncesOf = (tag) => [...tag.replace(/^<[^\t\n\f\r />]*/, "").matchAll(ATTRIBUTE)].filter((m) => m[1].toLowerCase() === "nonce").map((m) => m[2] ?? m[3] ?? m[4] ?? "");
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** The checks every HTML response must pass, however it was asked for. */
function checkPage(res, html) {
  const policy = res.headers.get("content-security-policy");
  const nonce = nonceOf(policy);
  check(res.headers.get("content-type")?.startsWith("text/html"), `is HTML (${res.status})`);
  check(!!nonce, "Content-Security-Policy carries a nonce");
  check(/script-src 'nonce-[^']+' 'strict-dynamic'/.test(policy ?? ""), "script-src is nonce + 'strict-dynamic'");
  check(!/unsafe-eval/.test(policy ?? ""), "no 'unsafe-eval'");
  check((protocol === "https:") === /upgrade-insecure-requests/.test(policy ?? ""), "upgrade-insecure-requests only on https");
  check(!res.headers.get("content-security-policy-report-only"), "no report-only header");

  // Script and style bodies out of the way first: flight data is full of tag-like text.
  const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1").replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi, "$1");
  const startTags = [...markup.matchAll(/<[a-zA-Z][^>]*>/g)].map((m) => m[0]);
  const stamped = startTags.filter((t) => /^<(script|style)[\t\n\f\r />]/i.test(t) || (/^<link[\t\n\f\r />]/i.test(t) && / as="script"/i.test(t)));
  // Exactly one nonce, and it is the header's: a second one makes browsers honour
  // neither, a foreign one means a poisoned cache got through the edge function.
  const wrong = stamped.filter((t) => noncesOf(t).join() !== nonce);
  check(stamped.length > 0 && wrong.length === 0, `all ${stamped.length} script/style/preload tags carry the header's nonce and no other${wrong[0] ? ` — first that does not: ${wrong[0].slice(0, 100)}` : ""}`);
  const stray = startTags.filter((t) => !stamped.includes(t) && noncesOf(t).length > 0);
  check(stray.length === 0, `no nonce attribute on any other tag${stray[0] ? ` — found: ${stray[0].slice(0, 100)}` : ""}`);
  check(!/\son[a-z]+="/i.test(markup), "no inline event handlers in the markup");
  // Production answers brotli; if the function's output went out raw, `/` would be
  // ten times the bytes and the Lighthouse score would show it.
  if (protocol === "https:") check(!!res.headers.get("content-encoding"), `compressed on the way out (content-encoding: ${res.headers.get("content-encoding") ?? "none"})`);
  return nonce;
}

for (const path of PAGES) {
  console.log(`\n${path}`);
  const res = await fetch(origin + path, { headers: { accept: "text/html" } });
  const nonce = checkPage(res, await res.text());
  // The admin page is rendered per request — what it shows depends on the session
  // cookie — and says so. The function adds the policy; it must not take that away,
  // or some cache gets to keep a copy of a signed-in page. Under `netlify dev` only
  // the no-store line proves anything: the CLI puts netlify.toml's /admin/* header
  // (X-Robots-Tag) back on every response, the function's included. On a preview or
  // the live site the toml rules do not reach function-served pages, and both do.
  if (path === "/admin/upload") {
    check(/no-store/.test(res.headers.get("cache-control") ?? ""), `still says no-store (cache-control: ${res.headers.get("cache-control") ?? "none"})`);
    check(/noindex/.test(res.headers.get("x-robots-tag") ?? ""), "still says noindex");
  }

  const again = await fetch(origin + path, { headers: { accept: "text/html" } });
  await again.arrayBuffer();
  check(nonceOf(again.headers.get("content-security-policy")) !== nonce, "a second request gets a different nonce");

  // A 304 next to a new nonce would make the browser block its own cached copy.
  const etag = res.headers.get("etag");
  if (!etag) check(true, "no ETag on the page, so no browser can ask for a 304");
  else {
    const cond = await fetch(origin + path, { headers: { accept: "text/html", "if-none-match": etag } });
    await cond.arrayBuffer();
    check(cond.status !== 304, `an ETag is present (${etag}); a conditional request must not answer 304 — got ${cond.status}`);
  }
}

// `POST /` renders the page as well, and a cross-site form can send a visitor there.
console.log("\nPOST / (a form posted at a page)");
const posted = await fetch(origin + "/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=1" });
const postedBody = await posted.text();
if (posted.headers.get("content-type")?.startsWith("text/html")) checkPage(posted, postedBody);
else check(true, `does not answer with a page (${posted.status} ${posted.headers.get("content-type") ?? "no content-type"})`);

console.log("\nflight data (client-side navigation)");
const rsc = await fetch(origin + "/about-me?_rsc=verify", { headers: { rsc: "1" } });
await rsc.arrayBuffer();
check(rsc.headers.get("content-type")?.startsWith("text/x-component"), "answers text/x-component");
check(!nonceOf(rsc.headers.get("content-security-policy")), "gets no nonce");

console.log("\nnot pages");
for (const path of ["/favicon.ico", "/api/revalidate"]) {
  const res = await fetch(origin + path);
  await res.arrayBuffer();
  check(!nonceOf(res.headers.get("content-security-policy")), `${path} is left alone (${res.status})`);
}

// The passkey endpoints answer JSON with headers of their own (no-store, noindex, and
// on sign-in the session cookie). /api/* is excluded from the edge function; this is
// the proof that it stays out of their way. The request is one the route's guard turns
// away on its headers alone (src/lib/admin/http.ts): the Origin every build accepts,
// then a Content-Type it does not — 415, the same on localhost, a preview and the live
// site, before the body or the database is looked at, so nothing is written anywhere.
// Not the target's own Origin: that is a 403 off nhatminh.dev, and `netlify dev`
// answers any 403 or 404 from the server behind it with Next's HTML 404 instead
// (it retries them as <path>.html), so the local run could never pass.
console.log("\nPOST /api/admin/login/options (a passkey endpoint, not a page)");
const api = await fetch(origin + "/api/admin/login/options", { method: "POST", headers: { origin: "https://nhatminh.dev", "content-type": "text/plain" }, body: "{}" });
const apiJson = await api.json().catch(() => null);
check(api.status === 415 && api.headers.get("content-type")?.startsWith("application/json") && apiJson !== null && typeof apiJson === "object", `answers its own JSON refusal (${api.status}${apiJson?.message ? ` "${apiJson.message}"` : ""}, expected 415)`);
check(!nonceOf(api.headers.get("content-security-policy")), "gets no nonce");
check(/no-store/.test(api.headers.get("cache-control") ?? "") && /noindex/.test(api.headers.get("x-robots-tag") ?? ""), `keeps its own headers (cache-control: ${api.headers.get("cache-control") ?? "none"}; x-robots-tag: ${api.headers.get("x-robots-tag") ?? "none"})`);

// Next.js copies a nonce from a Content-Security-Policy REQUEST header into the page
// it renders, and an ISR page rendered for one request is cached for everyone. Plant
// one both ways a stranger could — a plain request and a flight request, which never
// passes through the edge function — then look at what the next visitor gets.
if (poison) {
  const targets = [
    { path: "/about-me/education", marker: "POISONa", headers: { "content-security-policy": "script-src 'nonce-POISONa'" } },
    { path: "/about-me/languages", marker: "POISONb", headers: { rsc: "1", "content-security-policy-report-only": "default-src 'nonce-POISONb'" }, query: "?_rsc=poison" },
  ];
  console.log("\ncache poisoning (waiting 61 s for the pages to go stale)");
  for (const t of targets) await (await fetch(origin + t.path)).arrayBuffer();
  await sleep(61);
  for (const t of targets) await (await fetch(origin + t.path + (t.query ?? ""), { headers: t.headers })).arrayBuffer();
  await sleep(10);
  for (const t of targets) {
    console.log(`\n${t.path} after a poisoned ${t.headers.rsc ? "flight " : ""}request`);
    const res = await fetch(origin + t.path, { headers: { accept: "text/html" } });
    const html = await res.text();
    // The marker survives inside flight data (a script body, never rewritten), which
    // is how to tell that the planted render is the one being served.
    note(html.includes(t.marker) ? "the planted nonce reached the cached page — this is the case under test" : "the planted nonce did not reach the cache here (the platform dropped the header, or the page was not stale)");
    checkPage(res, html);
  }
}

// The local proof run switches the policy on with a throwaway env file; left behind,
// it would enforce the policy on `next dev` under `npm run dev:netlify`.
if (local && existsSync(".env.development.local") && /^CSP_MODE=/m.test(readFileSync(".env.development.local", "utf8"))) {
  console.log("\nreminder: when the proof is done, remove the switch:  rm .env.development.local");
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
