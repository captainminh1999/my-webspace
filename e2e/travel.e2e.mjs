// e2e/travel.e2e.mjs — the Travel card and dialog in a real browser, against `next start` rendering
// e2e/fixtures/journeys.json (run by scripts/e2e.mjs). Five invented trips, 2016-2025: one without a month,
// side trips by land, and empty years in between. The dialog's map lights the trip being read: the sweeps below
// scroll it end to end at every size and check what is lit at each step.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://localhost:3100";
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
after(() => browser.close());

export const VIEWPORTS = { laptop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 }, phone: { width: 390, height: 844 }, small: { width: 320, height: 640 } };

/** A page at `viewport`, with the errors it threw collected (a blocked analytics request is not one). */
async function open(viewport, { theme = "dark", reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|googletagmanager|google-analytics/.test(m.text())) errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  return { page, errors, close: () => context.close() };
}

const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function openDialog(page) {
  await page.locator("#card-travel button[data-open-dialog]").click();
  const dialog = page.locator("#dialog-travel");
  await dialog.waitFor({ state: "visible" });
  return dialog;
}

test("the card shows the trips from the fixture, at every width, without overflowing", async () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const { page, errors, close } = await open(viewport);
    const card = page.locator("#card-travel");
    await card.scrollIntoViewIfNeeded();
    const text = (await card.innerText()).replace(/\s+/g, " ");
    assert.match(text, /6 countries/i, name);
    assert.match(text, /9 cities · 5 trips · 16 journeys · since 2016/i, name);
    assert.equal(await overflowX(page), 0, `${name}: no horizontal scroll`);
    assert.deepEqual(errors, [], `${name}: no errors`);
    await close();
  }
});

test("the dialog lists every trip, newest first, and does not overflow", async () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const { page, errors, close } = await open(viewport);
    const dialog = await openDialog(page);
    const all = (await dialog.innerText()).replace(/\s+/g, " ");
    // The list starts at "Every trip"; the figures and the month rail above it name the years too.
    const text = all.slice(all.search(/every trip/i));
    const at = ["2025", "2023", "2019", "2018", "2016"].map((y) => text.indexOf(y));
    assert.ok(at.every((i) => i >= 0), `${name}: every year listed`);
    assert.deepEqual([...at].sort((a, b) => a - b), at, `${name}: newest first`);
    assert.match(text, /2020 – 2022\s*No journeys/i, `${name}: the empty years`);
    assert.equal(await overflowX(page), 0, `${name}: no horizontal scroll`);
    assert.deepEqual(errors, [], `${name}: no errors`);
    await close();
  }
});

test("the light theme renders the map and its labels", async () => {
  const { page, errors, close } = await open(VIEWPORTS.laptop, { theme: "light" });
  const card = page.locator("#card-travel");
  await card.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
  assert.ok((await card.locator(".tmap-lbl").count()) > 0, "labels on the map");
  assert.deepEqual(errors, []);
  await close();
});

/** Trip indexes are in the order travelled, so the newest is the highest. */
const TRIPS = 5;
const SWEEP = { ...VIEWPORTS, laptop1280: { width: 1280, height: 720 }, laptop1024: { width: 1024, height: 768 }, sideways: { width: 844, height: 390 } };

/**
 * Scroll the dialog from top to bottom in `step` px, waiting two frames at each, and record what is lit. One
 * evaluate, so a sweep takes a second, not a minute.
 */
const sweep = (page, step = 4) =>
  page.evaluate(async (step) => {
    const sc = document.querySelector("#dialog-travel [data-scroller]");
    const root = sc.querySelector(".sl");
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const accent = getComputedStyle(root).getPropertyValue("--accent").trim();
    const max = sc.scrollHeight - sc.clientHeight;
    const out = [];
    for (let y = 0; ; y = Math.min(max, y + step)) {
      sc.scrollTop = y;
      await frames();
      const a = root.dataset.activeTrip;
      const prev = out.at(-1);
      const row = { y, at: sc.scrollTop, a, height: sc.scrollHeight };
      if (!prev || prev.a !== a) {
        // What is lit, checked where the state changes, once its 160ms fade is over.
        await new Promise((r) => setTimeout(r, 220));
        row.routes = [...root.querySelectorAll(".sl-r.is-active")].map((g) => g.dataset.lit);
        row.articles = [...root.querySelectorAll("article.is-active")].map((e) => e.dataset.trip);
        const rail = root.querySelector(".trip-rail-mark.is-active");
        row.rail = rail ? (rail.classList.contains("unknown") ? "hollow" : getComputedStyle(rail).backgroundColor) : null;
        row.labels = [...root.querySelectorAll(".sl-set.is-active .tmap-lbl")].filter((l) => l.offsetParent && l.getBoundingClientRect().width > 0).length;
      }
      out.push(row);
      if (y >= max) break;
    }
    const probe = document.createElement("i");
    probe.style.color = accent;
    document.body.append(probe);
    const accentRgb = getComputedStyle(probe).color;
    probe.remove();
    return { rows: out, accentRgb, max };
  }, step);

test("the dialog opens on the overview: nothing lit, the latest trip in the accent, and a word that the map follows", async () => {
  const { page, errors, close } = await open(VIEWPORTS.laptop);
  const dialog = await openDialog(page);
  const root = dialog.locator(".sl");
  assert.equal(await root.getAttribute("data-active-trip"), "");
  assert.equal(await root.getAttribute("data-follow"), "", "the island ran");
  assert.equal(await dialog.locator(".is-active").count(), 0);
  assert.equal(await dialog.locator(`.sl-r.latest`).evaluate((g) => getComputedStyle(g).opacity), "1");
  assert.ok(await dialog.locator(".cap-hint").isVisible(), "the follow hint shows once the island runs");
  assert.deepEqual(errors, []);
  await close();
});

test("the server sends the overview: nothing lit, and no promise the map follows (that waits for the island)", async () => {
  const html = await (await fetch(URL)).text();
  const dialog = html.slice(html.indexOf('id="dialog-travel"'));
  assert.match(dialog, /class="sl" data-active-trip=""/);
  assert.doesNotMatch(dialog, /is-active|data-follow/);
  assert.match(dialog, /class="sl-r latest"/);
  assert.match(dialog, /class="cap-hint"/, "the hint is in the HTML, hidden by CSS until the island marks the root");
});

test("scrolling lights every trip once, newest first, for long enough to read, and never moves the layout", async () => {
  for (const [name, viewport] of Object.entries(SWEEP)) {
    const { page, errors, close } = await open(viewport);
    await openDialog(page);
    const { rows, accentRgb, max } = await sweep(page);
    assert.ok(max > 0, `${name}: the dialog scrolls`);
    const changes = rows.filter((r, i) => !i || rows[i - 1].a !== r.a);
    assert.deepEqual(
      changes.map((r) => r.a),
      ["", ...Array.from({ length: TRIPS }, (_, k) => String(TRIPS - 1 - k))],
      `${name}: overview, then each trip once, newest first`,
    );
    for (const [k, r] of changes.entries()) {
      const until = changes[k + 1]?.y ?? max + 4;
      if (r.a) assert.ok(until - r.y >= 40, `${name}: trip ${r.a} lit for ${until - r.y}px of scroll`);
      if (!r.a) continue;
      assert.ok(r.routes.length === 1 && r.routes[0].split(" ").includes(r.a), `${name}: one route group lit, trip ${r.a}'s (${r.routes})`);
      assert.deepEqual(r.articles, [r.a], `${name}: one trip marked in the list`);
      assert.ok(r.rail === "hollow" || r.rail === accentRgb, `${name}: trip ${r.a}'s rail mark is in the accent (${r.rail})`);
      assert.ok(r.labels >= 1, `${name}: trip ${r.a} names a place on the map`);
    }
    assert.equal(new Set(rows.map((r) => r.height)).size, 1, `${name}: the scroll height never changes`);
    assert.ok(rows.every((r) => Math.abs(r.at - r.y) <= 1), `${name}: nothing pulls the scroll position`);
    assert.equal(await overflowX(page), 0, `${name}: no horizontal scroll`);
    assert.deepEqual(errors, [], `${name}: no errors`);
    await close();
  }
});

test("the pinned map leaves room to read: inside the scroll area beside the list, at most a third of it above", async () => {
  const geometry = (page) =>
    page.evaluate(() => {
      const sc = document.querySelector("#dialog-travel [data-scroller]").getBoundingClientRect();
      const pin = document.querySelector("#dialog-travel .sl-pin").getBoundingClientRect();
      const fig = document.querySelector("#dialog-travel .sl-fig").getBoundingClientRect();
      const list = document.querySelector("#dialog-travel .sl-list").getBoundingClientRect();
      return { sc: { top: sc.top, bottom: sc.bottom, h: sc.height }, pin: { bottom: pin.bottom }, fig: { top: fig.top, bottom: fig.bottom, right: fig.right, h: fig.height }, list: { left: list.left } };
    });
  for (const name of ["laptop", "laptop1280", "laptop1024"]) {
    const { page, close } = await open(SWEEP[name]);
    await openDialog(page);
    const g = await geometry(page);
    assert.ok(g.pin.bottom <= g.sc.bottom + 0.5, `${name}: the pinned column fits (${g.pin.bottom} vs ${g.sc.bottom})`);
    await close();
  }
  // Stacked, the map is at most 31% of the scroll area tall, unless that would make it narrower than the 240px its
  // labels are placed for; the caption adds 34px.
  for (const name of ["phone", "small", "tablet"]) {
    const { page, close } = await open(SWEEP[name]);
    const dialog = await openDialog(page);
    await page.locator("#dialog-travel [data-scroller]").evaluate((e) => (e.scrollTop = e.scrollHeight / 2));
    const g = await geometry(page);
    const ar = Number(await dialog.locator(".sl").evaluate((e) => e.style.getPropertyValue("--ar")));
    assert.ok(Math.abs(g.fig.top - g.sc.top) <= 1, `${name}: the map stays pinned at the top`);
    assert.ok(g.fig.h - 34 <= Math.max(0.31 * g.sc.h, 240 / ar) + 1, `${name}: the map is ${g.fig.h - 34}px of a ${g.sc.h}px scroll area`);
    if (name === "phone") assert.ok(g.fig.h / g.sc.h <= 0.36, `${name}: map and caption take ${((g.fig.h / g.sc.h) * 100).toFixed(0)}%`);
    await close();
  }
  const { page, close } = await open(SWEEP.sideways);
  await openDialog(page);
  await page.locator("#dialog-travel [data-scroller]").evaluate((e) => (e.scrollTop = e.scrollHeight));
  const g = await geometry(page);
  assert.ok(g.fig.right <= g.list.left && g.fig.top >= g.sc.top - 0.5 && g.fig.bottom <= g.sc.bottom + 0.5, `sideways: the map stays in view beside the list ${JSON.stringify(g)}`);
  await close();
});

test("a trip heading reached by keyboard lights its trip; scrolling on hands the map back to the reading line", async () => {
  for (const name of ["laptop", "phone"]) {
    const { page, errors, close } = await open(SWEEP[name]);
    const dialog = await openDialog(page);
    const root = dialog.locator(".sl");
    const heads = dialog.locator(".trip-h");
    await dialog.locator("button[type=submit]").focus();
    for (let k = 0; k < TRIPS; k++) {
      await page.keyboard.press("Tab");
      const trip = await heads.nth(k).evaluate((h) => h.closest("[data-trip]").dataset.trip);
      assert.equal(await page.evaluate(() => document.activeElement.closest("[data-trip]")?.dataset.trip), trip, `${name}: Tab ${k + 1} reaches trip ${trip}`);
      await page.waitForFunction((t) => document.querySelector("#dialog-travel .sl").dataset.activeTrip === t, trip, { timeout: 2000 });
      // Never under the pinned map.
      const [head, fig] = await Promise.all([heads.nth(k).boundingBox(), dialog.locator(".sl-fig").boundingBox()]);
      if (name === "phone") assert.ok(head.y >= fig.y + fig.height - 1, `${name}: trip ${trip}'s heading clears the map`);
    }
    // Back to the second trip, then page on: the focused trip lets go and the line decides.
    await heads.nth(1).focus();
    await page.keyboard.press("PageDown");
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(150);
    const held = await root.getAttribute("data-active-trip");
    await dialog.locator("button[type=submit]").focus();
    await page.waitForTimeout(150);
    assert.equal(held, await root.getAttribute("data-active-trip"), `${name}: after paging on, the trip at the line is lit, not the focused one`);
    assert.deepEqual(errors, [], `${name}: no errors`);
    await close();
  }
});

test("with reduced motion nothing fades: a lit state arrives at once", async () => {
  const { page, close } = await open(VIEWPORTS.laptop, { reducedMotion: "reduce" });
  const dialog = await openDialog(page);
  const t = await dialog.locator(".sl-set").first().evaluate((e) => ({ d: getComputedStyle(e).transitionDuration, delay: getComputedStyle(e).transitionDelay }));
  assert.ok(t.d.split(",").every((x) => parseFloat(x) <= 0.001), `duration ${t.d}`);
  assert.ok(t.delay.split(",").every((x) => parseFloat(x) === 0), `delay ${t.delay}`);
  await close();
});

test("in the light theme the lit trip's rule is the accent, over the column rule", async () => {
  const { page, close } = await open(VIEWPORTS.laptop, { theme: "light" });
  const dialog = await openDialog(page);
  await dialog.locator(".trip-h").nth(2).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const lit = dialog.locator("article.trip.is-active");
  await lit.waitFor();
  await page.waitForTimeout(250); // the rule fades in over 160ms
  const [rule, accent] = await lit.evaluate((a) => [getComputedStyle(a).borderLeftColor, getComputedStyle(a).getPropertyValue("--accent")]);
  const want = await page.evaluate((c) => {
    const i = document.createElement("i");
    i.style.color = c;
    document.body.append(i);
    const v = getComputedStyle(i).color;
    i.remove();
    return v;
  }, accent.trim());
  assert.equal(rule, want);
  const [a, list] = await Promise.all([lit.boundingBox(), dialog.locator(".sl-list").boundingBox()]);
  assert.ok(Math.abs(a.x - list.x) <= 1.5, `the 2px rule sits on the column rule (${a.x} vs ${list.x})`);
  await close();
});
