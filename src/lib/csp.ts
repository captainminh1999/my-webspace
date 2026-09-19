// Content-Security-Policy: the policy text and the HTML pass that makes it work.
//
// The pages are ISR — one cached HTML document serves everyone for a minute or
// more — so the server cannot put a per-request nonce in it (Next.js only does
// that for dynamically rendered pages). Instead netlify/edge-functions/csp.ts
// runs this on the way out of the CDN cache: a fresh nonce per response, stamped
// on every <script>, <style> and script preload the server rendered, and the
// matching header.
//
// What that buys: only script that was in the server's HTML, or was loaded by it,
// ever runs. Markup injected in the browser, inline event handlers, eval, an
// injected <base>, a script from a host nobody chose — all refused. React already
// escapes what it renders and rewrites javascript: links, so this is the second
// lock, for the day something slips past the first.
//
// What it does not buy: a <script> that our own server was tricked into rendering
// gets the nonce like any other. The way to make that hole real is
// dangerouslySetInnerHTML with data in it — csp.test.ts fails if that ever
// appears outside layout.tsx.
//
// No imports and no platform APIs beyond the Streams standard: this file runs in
// Deno (the edge function) and in Node (the unit tests).

/** 144 random bits, base64. A new one for every HTML response. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Where the Google tag sends hits: www/region1.google-analytics.com, and
 * analytics.google.com when the property has Google Signals on. Deliberately not
 * Google's blanket https://*.google.com — a blocked hit costs one pageview in GA
 * and shows up in the console, which is the better failure.
 */
const GA_CONNECT = "https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com";

/**
 * The full policy for an HTML page.
 *
 * `secure` is false only on http://localhost — upgrade-insecure-requests there
 * makes Safari rewrite every asset URL to https://localhost and load nothing.
 */
export function contentSecurityPolicy(nonce: string, { secure }: { secure: boolean }): string {
  return [
    // Anything not named below: same origin only.
    "default-src 'self'",
    // The nonce is the whole script policy. 'strict-dynamic' lets a nonced script
    // load others (Next's chunks on navigation, gtag.js from the Analytics island)
    // and makes CSP3 browsers ignore 'self', https: and 'unsafe-inline' — those
    // three are only what older browsers fall back to. No 'unsafe-eval': nothing
    // in the production bundle needs it.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' https: 'unsafe-inline'`,
    // Stylesheets are files from /_next/static; the one inline <style> is Next's
    // built-in 404 page, which gets the nonce. style="" attributes are everywhere
    // (sparklines, the weather raster, next/image) and cannot carry a nonce, so
    // attributes are allowed — they can restyle, not run code. style-src is the
    // fallback for browsers without the -elem/-attr split.
    "style-src 'self' 'unsafe-inline'",
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    // News thumbnails are plain <img> from whichever publisher ran the story.
    "img-src 'self' data: https:",
    // next/font self-hosts both families.
    "font-src 'self'",
    // Next's RSC fetches, the functions and the passkey endpoints are same-origin.
    `connect-src 'self' ${GA_CONNECT}`,
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    // No <base> anywhere, so nothing may add one and re-point relative script URLs.
    "base-uri 'none'",
    "form-action 'self'",
    // Same job as X-Frame-Options: DENY, which stays for browsers that predate this.
    "frame-ancestors 'none'",
    ...(secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * The directives that need no nonce. next.config.ts sends these on every page so
 * that a response the edge function did not touch (it failed open, or the site is
 * running under plain `next dev` / `next start`) still refuses framing, <base>,
 * plugins and cross-origin form posts. The edge function replaces this header.
 */
export const BASELINE_POLICY = "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

// ─────────────────────────────────────────────────────────────────────────────
// The scanner. It has to agree with the browser about what is a tag. Where it sees a
// <script> the browser does not, the nonce lands in text — untidy. Where it writes
// into something the browser reads differently, it can turn markup that was inert
// into a script that runs with our nonce, which is the one way this file could make
// a page less safe than it arrived. So it reads the way the HTML tokenizer does, and
// whitespace below is [\t\n\f\r ], never \s: those five are all HTML knows. \s has
// twenty more (NBSP, vertical tab, U+2028 …), and to a browser <script{NBSP}x> is
// an unknown element called "script{NBSP}x" whose content is just text.

/** The tags that get the nonce (script preloads too — isScriptPreload). */
const STAMPED = /^<(script|style)(?=[\t\n\f\r />])/i;
const IS_LINK = /^<link(?=[\t\n\f\r />])/i;
/** "<p" or "</p": a tag name runs to the first whitespace, "/" or ">". */
const TAG_NAME = /^<\/?[^\t\n\f\r />]*/;
/**
 * One attribute the way the tokenizer reads it, starting where the last one ended
 * (sticky): a name, then optionally `=` and a double-quoted [2], single-quoted [3]
 * or bare [4] value. Walking whole attributes is what keeps a "nonce=" inside some
 * other attribute's value from being touched, and what finds one that follows a
 * closing quote with no space (src="a"nonce="x" is two attributes to a browser).
 * [5] is a quote that opens a value and never closes: the tag is not finished.
 */
const ATTRIBUTE = /[\t\n\f\r /]*([^\t\n\f\r />][^\t\n\f\r />=]*)(?:[\t\n\f\r ]*=[\t\n\f\r ]*(?:"([^"]*)"|'([^']*)'|((["']?)[^\t\n\f\r >]*)))?/y;
const TAG_CLOSE = /[\t\n\f\r /]*>/y;
/** A start tag this long is not one of ours; stop waiting for its `>`. */
const MAX_TAG = 64 * 1024;

/**
 * Index just past the `>` that closes the tag at the start of `s`, or -1 if it is
 * not in `s` yet. A quote only hides a `>` where the tokenizer says so — at the
 * start of an attribute value. In <p title=it's> the tag ends at that `>`.
 */
function tagEnd(s: string): number {
  let at = TAG_NAME.exec(s)![0].length;
  ATTRIBUTE.lastIndex = at;
  for (let m; (m = ATTRIBUTE.exec(s)); at = ATTRIBUTE.lastIndex) if (m[5]) return -1;
  TAG_CLOSE.lastIndex = at;
  return TAG_CLOSE.test(s) ? TAG_CLOSE.lastIndex : -1;
}

/**
 * <link rel="preload" as="script">, judged by its attributes — the first of each
 * name, as a browser takes them — not by text that may sit inside a title="…":
 * style-src-elem honours the nonce, so a stylesheet link must not come by one.
 */
function isScriptPreload(tag: string): boolean {
  if (!IS_LINK.test(tag)) return false;
  let rel: string | undefined;
  let as: string | undefined;
  ATTRIBUTE.lastIndex = "<link".length;
  for (let m; (m = ATTRIBUTE.exec(tag)); ) {
    const name = m[1].toLowerCase();
    const value = (m[2] ?? m[3] ?? m[4] ?? "").toLowerCase();
    if (name === "rel") rel ??= value;
    else if (name === "as") as ??= value;
  }
  return as === "script" && (rel ?? "").split(/[\t\n\f\r ]+/).includes("preload");
}

/**
 * Returns the start tag with this response's nonce on it if it is a <script>,
 * <style> or script preload — and with any nonce it arrived with removed,
 * whatever tag it is.
 *
 * Removed, not respected: Next.js copies a nonce out of a Content-Security-Policy
 * REQUEST header into the page it renders, and an ISR page rendered for one
 * request is cached for everyone. So anyone can send that header once a minute
 * and plant nonce="theirs" on every script in the cached page; left in place, the
 * tags would no longer match the header and nothing would run. Removed, not just
 * preceded by ours: browsers refuse to honour a nonce on a tag that has the
 * attribute twice. Nothing is lost — whoever could write <script nonce=x> into
 * the server's HTML could write a plain <script> too.
 */
function stamp(tag: string, nonce: string): string {
  const ours = STAMPED.test(tag) || isScriptPreload(tag);
  if (!ours && !/nonce/i.test(tag)) return tag;
  const name = TAG_NAME.exec(tag)![0];
  let rest = "";
  let at = name.length;
  // Taking an attribute out must not change how its neighbours read. Two ways it can:
  let bare = false; // the last attribute kept has no value, and
  let gap = false; // a nonce has gone from between it and the next one.
  ATTRIBUTE.lastIndex = at;
  for (let m; (m = ATTRIBUTE.exec(tag)); at = ATTRIBUTE.lastIndex) {
    if (m[1].toLowerCase() === "nonce") {
      gap = true;
      // src=a nonce="x"id="b", or …nonce="x"/>: the nonce was all that stood between
      // its neighbours, and a bare value would swallow what follows, "/" included.
      if (!/[\t\n\f\r >]/.test(tag[ATTRIBUTE.lastIndex])) rest += " ";
      continue;
    }
    // <p a nonce=x ="…">: next to a name with no value, "=" would now start ITS value —
    // and if that opens a quote, the tag swallows the markup after it. "/" keeps them apart.
    if (bare && gap && m[1][0] === "=") rest += "/";
    rest += m[0];
    bare = m[2] === undefined && m[3] === undefined && m[4] === undefined;
    gap = false;
  }
  return `${name}${ours ? ` nonce="${nonce}"` : ""}${rest}${tag.slice(at)}`;
}

/**
 * Elements whose content is text to a browser, whatever it looks like. Only script
 * and style get the nonce; the rest are here to be skipped, so that a "<script"
 * inside a <title> or <textarea> is left as the text it is. <plaintext> has no end
 * tag — MARKS has none for it — so everything after one is text, as in a browser.
 */
const OPENS_RAW = /^<(script|style|title|textarea|xmp|iframe|noembed|noframes|plaintext)(?=[\t\n\f\r />])/i;
/**
 * What matters inside such an element: its end tag, and — in a script only — the
 * three marks that can postpone it. After "<!--", a "<script" makes the next
 * "</script" part of the text, until "-->" (the tokenizer's "script data double
 * escaped" state): <script><!--<script>x</script> var s="<script>"; --></script>
 * is ONE script to a browser, and a nonce written into that string would break it.
 */
const MARKS = /<!(?=--)|-->|<\/?(?:script|style|title|textarea|xmp|iframe|noembed|noframes)(?=[\t\n\f\r />])/gi;
/** Longest mark that can straddle two chunks, less its last character: "</textarea", "</noframes". */
const HOLD = 10;
/** A whole comment. To a browser <!--> and <!---> are complete ones, and --!> ends one as well as -->. */
const COMMENT = /^<!--(?:-?>|[\s\S]*?--!?>)/;

/**
 * Streams HTML through, putting nonce="…" on every <script>, <style> and
 * <link rel="preload" as="script"> start tag, and taking any other nonce out.
 *
 * A small scanner rather than an HTML parser (the usual HTMLRewriter is a WASM
 * module imported from a URL at build time): it only has to find start tags, and
 * it never rewrites the inside of a script or style — flight data is JavaScript
 * text, and a "<script" in there must stay as it is.
 */
export function addNonces(nonce: string): TransformStream<string, string> {
  let buf = "";
  /** The raw-text element we are inside, lower case. */
  let raw: string | null = null;
  /** Inside a script: 0 plain, 1 after "<!--", 2 after "<!--" and "<script". */
  let escape = 0;

  function drain(controller: TransformStreamDefaultController<string>, final: boolean) {
    let out = "";
    for (;;) {
      if (raw) {
        let end = -1;
        let seen = 0; // marks up to here have been counted; never read them twice
        MARKS.lastIndex = 0;
        for (let m; (m = MARKS.exec(buf)); seen = MARKS.lastIndex) {
          const mark = m[0].toLowerCase();
          if (mark === `</${raw}`) {
            if (escape < 2) {
              end = m.index;
              break;
            }
            escape = 1;
          } else if (raw !== "script") continue;
          else if (mark === "<!") escape = escape || 1;
          else if (mark === "-->") escape = 0;
          else if (mark === "<script" && escape === 1) escape = 2;
        }
        if (end === -1) {
          // Still inside the body. Pass it on, holding back a possible half "</script".
          const upTo = final ? buf.length : Math.max(seen, buf.length - HOLD);
          out += buf.slice(0, upTo);
          buf = buf.slice(upTo);
          break;
        }
        out += buf.slice(0, end);
        buf = buf.slice(end);
        raw = null;
        continue;
      }
      const lt = buf.indexOf("<");
      if (lt === -1) {
        out += buf;
        buf = "";
        break;
      }
      out += buf.slice(0, lt);
      buf = buf.slice(lt);
      if (!final && buf.length < 4) break; // not enough to tell a tag from a comment yet
      let cut: number;
      if (buf.startsWith("<!--")) {
        // Comments pay no attention to quotes (React's are <!--$-->, <!-- -->).
        const comment = COMMENT.exec(buf);
        if (!comment && !final) break;
        cut = comment ? comment[0].length : buf.length;
      } else if (/^<(?:[!?]|\/[^a-zA-Z])/.test(buf)) {
        // <!DOCTYPE …>, <?…> and "</" before anything but a letter: what browsers call a
        // bogus comment. It ends at the first ">" whatever quotes it contains, and
        // nothing in it is an attribute.
        const close = buf.indexOf(">");
        if (close === -1 && !final && buf.length < MAX_TAG) break;
        cut = close === -1 ? buf.length : close + 1;
      } else if (!/^<\/?[a-zA-Z]/.test(buf)) {
        cut = 1; // a bare "<" in text, not a tag
      } else {
        const end = tagEnd(buf);
        if (end === -1) {
          if (!final && buf.length < MAX_TAG) break; // the rest of the tag is in the next chunk
          out += buf;
          buf = "";
          break;
        }
        const tag = buf.slice(0, end);
        const opened = OPENS_RAW.exec(tag);
        out += stamp(tag, nonce);
        buf = buf.slice(end);
        if (opened) {
          raw = opened[1].toLowerCase();
          escape = 0;
        }
        continue;
      }
      out += buf.slice(0, cut);
      buf = buf.slice(cut);
    }
    if (out) controller.enqueue(out);
  }

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buf += chunk;
      drain(controller, false);
    },
    flush(controller) {
      drain(controller, true);
    },
  });
}
