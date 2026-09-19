import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addNonces, contentSecurityPolicy, newNonce } from '../csp.ts';

/** Runs `html` through the transform, cut into chunks of `size` characters. */
async function run(html: string, size = html.length || 1): Promise<string> {
  const chunks: string[] = [];
  for (let i = 0; i < html.length; i += size) chunks.push(html.slice(i, i + size));
  const source = new ReadableStream<string>({
    start(c) {
      for (const chunk of chunks) c.enqueue(chunk);
      c.close();
    },
  });
  const reader = source.pipeThrough(addNonces('N')).getReader();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += value;
  }
}

const PAGE =
  '<!DOCTYPE html><html><head><link rel="preload" href="/f.woff2" as="font"/>' +
  '<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js"/>' +
  '<script src="/_next/static/chunks/main.js" async=""></script>' +
  "<script>try{var t=localStorage.getItem('theme')}catch(e){}</script>" +
  '<style>body{margin:0}</style></head><body><p title="a > b">1 &lt; 2</p>' +
  '<script>self.__next_f.push([1,"x:\\"\\u003cscript\\u003e\\""])</script></body></html>';

const EXPECTED =
  '<!DOCTYPE html><html><head><link rel="preload" href="/f.woff2" as="font"/>' +
  '<link nonce="N" rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js"/>' +
  '<script nonce="N" src="/_next/static/chunks/main.js" async=""></script>' +
  '<script nonce="N">try{var t=localStorage.getItem(\'theme\')}catch(e){}</script>' +
  '<style nonce="N">body{margin:0}</style></head><body><p title="a > b">1 &lt; 2</p>' +
  '<script nonce="N">self.__next_f.push([1,"x:\\"\\u003cscript\\u003e\\""])</script></body></html>';

test('stamps scripts, styles and script preloads, and nothing else', async () => {
  assert.equal(await run(PAGE), EXPECTED);
});

test('gives the same answer however the stream is cut', async () => {
  for (const size of [1, 2, 3, 5, 7, 11, 64]) assert.equal(await run(PAGE, size), EXPECTED, `chunks of ${size}`);
});

test('never rewrites the inside of a script body', async () => {
  const html = '<script>var s="<script src=x>";var l="<link rel=preload as=script>";</script><p>after</p><script>2</script>';
  assert.equal(
    await run(html, 4),
    '<script nonce="N">var s="<script src=x>";var l="<link rel=preload as=script>";</script><p>after</p><script nonce="N">2</script>',
  );
});

// Next.js copies a nonce from a Content-Security-Policy REQUEST header into the ISR
// page it caches for everyone (see stamp() in csp.ts). This is that page.
test('replaces a nonce that arrives with the tag, so a poisoned cache still runs', async () => {
  const poisoned =
    '<link rel="stylesheet" href="/a.css" nonce="EVIL" data-precedence="next"/>' +
    '<link rel="preload" as="script" fetchPriority="low" nonce="EVIL" href="/w.js"/>' +
    '<script src="/m.js" async="" nonce="EVIL"></script><script nonce="EVIL">1</script>' +
    "<script NONCE='EVIL' id=a>2</script><script nonce=EVIL>3</script><script nonce>4</script>";
  const want =
    '<link rel="stylesheet" href="/a.css" data-precedence="next"/>' +
    '<link nonce="N" rel="preload" as="script" fetchPriority="low" href="/w.js"/>' +
    '<script nonce="N" src="/m.js" async=""></script><script nonce="N">1</script>' +
    '<script nonce="N" id=a>2</script><script nonce="N">3</script><script nonce="N">4</script>';
  for (const size of [1, 3, 7, 64, 1000]) assert.equal(await run(poisoned, size), want, `chunks of ${size}`);
});

test('never leaves two nonce attributes on a tag (browsers then honour neither)', async () => {
  assert.equal(await run('<script nonce="a" src="/x.js" nonce="b"></script>'), '<script nonce="N" src="/x.js"></script>');
});

test('a "nonce=" inside another attribute or in text is not an attribute', async () => {
  const html = '<a href="/posts/nonce-explained" title=\' nonce="x" \' data-nonce="keep">nonce="x"</a><p data-x="a > nonce=b">';
  assert.equal(await run(html, 5), html);
});

test('leaves lookalike tags alone', async () => {
  const html = '<scripted></scripted><styles></styles><link rel="stylesheet" href="/a.css"/><link rel="preload" as="style" href="/a.css"/>';
  assert.equal(await run(html, 3), html);
});

test('comments and bare "<" do not derail the scanner', async () => {
  const html = `<!--it's--><p>1 < 2 and "quoted</p><!--$--><script>1</script><!-- <script> -->`;
  const want = `<!--it's--><p>1 < 2 and "quoted</p><!--$--><script nonce="N">1</script><!-- <script> -->`;
  for (const size of [1, 2, 3, 5, 64]) assert.equal(await run(html, size), want, `chunks of ${size}`);
});

// From here to the policy tests: places where the scanner and a browser once read the
// same bytes differently. None is markup React or Next emit; each is a way for markup
// that is inert in a browser to pick up our nonce, or for a real script to miss it.
const NBSP = String.fromCharCode(0xa0);
const VTAB = String.fromCharCode(0x0b);

// To a browser only tab, LF, FF, CR and space end a tag name. <script{NBSP}x> is an
// unknown element and its text is inert; with nonce="N" pushed in after "<script" it
// IS a script, and it ran (seen in Chromium under the real policy).
test("a tag that only looks like <script> to JavaScript's \\s is not turned into one", async () => {
  for (const gap of [NBSP, VTAB, String.fromCharCode(0x2028), String.fromCharCode(0xfeff)]) {
    const html = `<script${gap}x>alert(1)</script>`;
    for (const size of [1, 3, 64]) assert.equal(await run(html, size), html, `U+${gap.charCodeAt(0).toString(16)}, chunks of ${size}`);
  }
  const others = `<style${NBSP}x>a{}</style><link${NBSP}rel=preload as=script>`;
  assert.equal(await run(others), others);
});

test('NBSP is not whitespace inside a tag or a script either', async () => {
  const link = `<a href=/x${NBSP}nonce=1 title=nonce>t</a>`;
  assert.equal(await run(link), link);
  const html = `<script>var a='</script${NBSP}>';var b='<script>';</script>`;
  assert.equal(await run(html, 5), `<script nonce="N">var a='</script${NBSP}>';var b='<script>';</script>`);
});

// Browsers accept an attribute straight after a closing quote. Searching for
// whitespace-then-name skipped it, so the foreign nonce stayed (two nonce attributes:
// honoured by no browser) or the search picked up again INSIDE the next quoted value.
test('an attribute with no space before it is still an attribute', async () => {
  assert.equal(await run('<script src="a"nonce="EVIL"></script>'), '<script nonce="N" src="a"></script>');
  assert.equal(await run('<script src="a"nonce="EVIL"id="b"></script>'), '<script nonce="N" src="a" id="b"></script>');
  assert.equal(await run('<p nonce="EVIL"<x>'), '<p <x>');
  const untouched = '<a b="1"c="d nonce=x e">';
  assert.equal(await run(untouched), untouched);
});

// The attributes left behind must read as they did. A bare value runs up to the next
// space, so it would take in the "/" of "/>"; and "=" after a name with no value starts
// that name's value — here a quote that swallows the rest of the page's markup.
test('taking a nonce out does not change how its neighbours read', async () => {
  assert.equal(await run('<link rel=preload as=script nonce="EVIL"/>'), '<link nonce="N" rel=preload as=script />');
  assert.equal(await run('<p hidden nonce=EVIL ="><i>">'), '<p hidden/ ="><i>">');
  assert.equal(await run('<p hidden nonce="EVIL"=x>'), '<p hidden /=x>');
  assert.equal(await run('<p id=a nonce=EVIL ="x">'), '<p id=a ="x">');
});

// A quote hides a ">" only at the start of an attribute value. Counting every quote
// made <p title=it's> run on to the next apostrophe; the nonce then went into what the
// browser reads as an attribute value, closed it early, and the markup after it —
// text a moment ago — was live, with the second script already carrying our nonce.
test('a quote in the middle of a bare value does not hide the end of the tag', async () => {
  const inert = `<p title=it's><a title="'><script>1</script><script>2</script>">`;
  for (const size of [1, 4, 64]) assert.equal(await run(inert, size), inert, `chunks of ${size}`);
  assert.equal(await run('<p a"b><script>1</script><p c">'), '<p a"b><script nonce="N">1</script><p c">');
  assert.equal(await run(`<p ="x><script>1</script>`), `<p ="x><script nonce="N">1</script>`);
});

test('<!-->, <!---> and --!> end a comment, as they do in a browser', async () => {
  for (const comment of ['<!-->', '<!--->', '<!-- a --!>', '<!---->', '<!----!>']) {
    for (const size of [1, 2, 3, 64]) assert.equal(await run(`${comment}<script>1</script>-->`, size), `${comment}<script nonce="N">1</script>-->`, `${comment} chunks of ${size}`);
  }
  // …and <!---!> does not: the first of those dashes belongs to the opening.
  assert.equal(await run('<!---!><script>1</script>-->'), '<!---!><script>1</script>-->');
});

// <!DOCTYPE …>, <!x>, <?…> and "</" before a non-letter end at the first ">", quotes or
// not, and have no attributes. Read as tags, the first hid a real script and the last
// lost its "/" — after which the browser saw a start tag where it had seen a comment.
test('bogus comments end at the first ">" and are passed through whole', async () => {
  for (const bogus of ['<!x ">', '<?xml ">', '<!DOCTYPE html ">', '</ ">']) {
    for (const size of [1, 3, 64]) assert.equal(await run(`${bogus}<script>1</script>"`, size), `${bogus}<script nonce="N">1</script>"`, `${bogus} chunks of ${size}`);
  }
  const comment = ' </ nonce="E" <script>';
  assert.equal(await run(comment), comment);
});

// To a browser this is ONE script: after "<!--", a "<script" makes the next "</script"
// part of the text. Ending the body at that first "</script" put a nonce inside the
// string literal, and the script died with a syntax error.
test('a script body that holds "<!--<script>…</script>" ends where the browser ends it', async () => {
  const body = '<!--<script>x</script>\nvar s="<script>"; //--></script ><p>after</p><script>2</script>';
  for (const size of [1, 2, 7, 64]) assert.equal(await run(`<script>${body}`, size), `<script nonce="N">${body.replace('<script>2', '<script nonce="N">2')}`, `chunks of ${size}`);
  // "<!-->" opens nothing, and without "<!--" a "<script" postpones nothing.
  assert.equal(await run('<script><!--><script></script><script>2</script>'), '<script nonce="N"><!--><script></script><script nonce="N">2</script>');
  assert.equal(await run('<script>"<script>"</script><script>2</script>'), '<script nonce="N">"<script>"</script><script nonce="N">2</script>');
  // "-->" ends it, and then the first "</script" is the end again.
  assert.equal(await run('<script><!--<script>--></script><script>2</script>'), '<script nonce="N"><!--<script>--></script><script nonce="N">2</script>');
});

test('text inside <title>, <textarea> and the other raw-text elements is left as text', async () => {
  for (const name of ['title', 'textarea', 'xmp', 'iframe', 'noembed', 'noframes', 'TEXTAREA']) {
    const html = `<${name}><script nonce="x">1</script><style>a{}</style></${name}>`;
    for (const size of [1, 6, 64]) assert.equal(await run(`${html}<script>2</script>`, size), `${html}<script nonce="N">2</script>`, `${name} chunks of ${size}`);
  }
  const forever = '<plaintext><script>1</script></plaintext><script nonce="x">2</script>';
  assert.equal(await run(forever, 5), forever);
});

test('a script preload is told by its attributes, not by text inside another one', async () => {
  const stylesheet = '<link rel="stylesheet" href="https://elsewhere.example/a.css" title=" rel=preload as=script ">';
  assert.equal(await run(stylesheet), stylesheet);
  assert.equal(await run("<link as=SCRIPT rel='modulepreload preload' href=/a.js>"), `<link nonce="N" as=SCRIPT rel='modulepreload preload' href=/a.js>`);
});

// 50 ms of CPU is all an edge function gets. The attribute expression used to retry
// from every position of a run of spaces: 10,000 of them cost 65 ms, 60,000 cost 2.4 s.
test('a long run of spaces or slashes in a tag is read in linear time', async () => {
  for (const html of [`<script${' '.repeat(60000)}></script>`, `<a title="nonce"${' /'.repeat(30000)}>`]) {
    const started = process.cpuUsage();
    const out = await run(html);
    const ms = process.cpuUsage(started).user / 1000;
    assert.equal(out.replace(' nonce="N"', ''), html);
    assert.ok(ms < 50, `took ${ms.toFixed(0)} ms of CPU`);
  }
});

test('passes an unfinished document through unchanged at the end', async () => {
  assert.equal(await run('<p>cut off <scr'), '<p>cut off <scr');
  assert.equal(await run('<script>never closed'), '<script nonce="N">never closed');
});

test('the policy carries the nonce and only upgrades on https', () => {
  const secure = contentSecurityPolicy('abc', { secure: true });
  assert.match(secure, /script-src 'nonce-abc' 'strict-dynamic'/);
  assert.match(secure, /style-src-elem 'self' 'nonce-abc'/);
  assert.match(secure, /upgrade-insecure-requests$/);
  assert.doesNotMatch(secure, /unsafe-eval/);
  assert.doesNotMatch(contentSecurityPolicy('abc', { secure: false }), /upgrade-insecure-requests/);
});

test('nonces are long, base64 and different every time', () => {
  const a = newNonce();
  assert.match(a, /^[A-Za-z0-9+/]{24}$/);
  assert.notEqual(a, newNonce());
});

// The edge function gives a nonce to every <script> the server renders, so the one
// way to turn data into a running script is to render it as raw HTML. React never
// does that unless asked; this keeps anyone from asking without reading csp.ts first.
test('dangerouslySetInnerHTML appears only in layout.tsx (the constant theme script)', () => {
  const src = join(import.meta.dirname, '..', '..');
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) && readFileSync(path, 'utf8').includes('dangerouslySetInnerHTML')) {
        offenders.push(path.slice(src.length + 1));
      }
    }
  };
  walk(src);
  // Sorted: the order readdirSync returns is the file system's business.
  assert.deepEqual(offenders.sort(), ['app/layout.tsx', 'lib/csp.ts']);
});
