// Edge function: gives every HTML page its Content-Security-Policy.
//
// Runs in front of the CDN cache on each page request, so the cached ISR page
// stays cached and only the nonce is new: take the page from context.next(),
// stamp a fresh nonce on the script/style tags the server rendered, send the
// header that names it. The policy and the reasoning are in src/lib/csp.ts.
import type { Config, Context } from "@netlify/edge-functions";
import { addNonces, contentSecurityPolicy, newNonce } from "../../src/lib/csp.ts";

// CSP_MODE=off switches the policy off; anything else, or nothing, enforces it.
// The exception is `netlify dev`: the page there normally comes from `next dev`,
// whose hot reloading needs eval and websockets, so the policy is off unless
// CSP_MODE=enforce is set (the local proof run, with `next start` behind it — see
// docs/ARCHITECTURE.md).
//
// Netlify gives edge functions the variables that existed when the deploy was
// made, so changing CSP_MODE on the site takes a new deploy. The brake that needs
// none: Deploys → the previous deploy → "Publish deploy" (instant and free).
function enforcing(context: Context): boolean {
  const mode = Netlify.env.get("CSP_MODE");
  if (mode === "off") return false;
  return mode === "enforce" || context.deploy.context !== "dev";
}

export default async function csp(request: Request, context: Context) {
  if (!enforcing(context)) return;

  // Netlify strips If-None-Match / If-Modified-Since from this inner request, so
  // what comes back is the whole page, never a 304.
  const response = await context.next();
  // Whatever the method: `POST /` renders the page too, and a cross-site form can
  // send a visitor there. HEAD, redirects and anything that is not HTML pass through,
  // exactly as context.next() gave them. (Under `netlify dev` that leaves a stale
  // content-encoding on the two unused SVGs in public/ that `next start` gzips — the
  // CLI's Deno has already decoded the body. Not stripped here: on Netlify the
  // untouched response is the right one. docs/ARCHITECTURE.md § 14b.)
  if (!response.body || !response.headers.get("content-type")?.startsWith("text/html")) return response;

  const nonce = newNonce();
  const headers = new Headers(response.headers);
  // Replaces the nonce-less baseline from next.config.ts (two policies would both apply).
  headers.set("content-security-policy", contentSecurityPolicy(nonce, { secure: new URL(request.url).protocol === "https:" }));
  // This body is now unique to this response. A validator would let a cache answer
  // "304, keep your copy" next to a header carrying a NEW nonce, and the browser
  // would then block every script in the copy it kept.
  headers.delete("etag");
  headers.delete("last-modified");
  // What leaves here is plain UTF-8 of a different length; compressing it for the
  // visitor is the CDN's job (scripts/verify-csp.mjs fails if it does not). Locally
  // `next start` gzips, and the stale header made browsers fail to decode the page.
  headers.delete("content-encoding");
  headers.delete("content-length");

  const body = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(addNonces(nonce))
    .pipeThrough(new TextEncoderStream());
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export const config: Config = {
  path: "/*",
  // No page lives under these: build assets and the image optimizer, the functions,
  // the route handlers — most of the site's requests, and the passkey endpoints'
  // JSON and Set-Cookie have no business passing through here. The price: an unknown
  // URL under one of them (/api/nope) answers Next's 404 document with the baseline
  // policy only. (favicon.ico and the files in public/ do come through, and are let
  // go by the content-type test above.)
  excludedPath: ["/_next/*", "/.netlify/*", "/api/*"],
  // No `method`: every method that can come back as a page gets the policy.
  // Next's client router asks for pages as flight data (RSC: 1) on every
  // navigation and prefetch; that is not HTML and should not cost an invocation.
  header: { rsc: false },
  // If this function throws, serve the page as the server made it (it still has
  // the baseline policy from next.config.ts) rather than an error page to every
  // visitor. Nobody is told when that happens, which is why verify-csp.mjs is run
  // against the live site after every deploy.
  onError: "bypass",
};
