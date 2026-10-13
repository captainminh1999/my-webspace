// e2e/travel.e2e.mjs — the Travel card and dialog in a real browser, against `next start` rendering
// e2e/fixtures/journeys.json (run by scripts/e2e.mjs). Eleven invented trips, 2016-2026: one without a month, side
// trips by land, three to the same place (one route set lit for trips 1, 2 and 10), a stay abroad with a trip out
// of it (a "set off from" mark), and empty years in between. The dialog's map lights the trip being read: the sweeps below
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
    assert.match(text, /7 countries/i, name);
    assert.match(text, /11 cities · 11 trips · 26 journeys · since 2016/i, name);
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
    const at = ["2026", "2025", "2024", "2023", "2019", "2018", "2017", "2016"].map((y) => text.indexOf(y));
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
const TRIPS = 11;
const SWEEP = {
  ...VIEWPORTS,
  laptop1280: { width: 1280, height: 720 },
  laptop1024: { width: 1024, height: 768 },
  laptopShort: { width: 1024, height: 600 },
  sideways: { width: 844, height: 390 },
  sidewaysShort: { width: 692, height: 280 },
};
/** From a laptop's width the map, its key and the rail are pinned beside the list; on a screen too short for it
 * (a 360px-wide phone on its side) nothing is pinned; elsewhere only the map is. */
const LAPTOP = new Set(["laptop", "laptop1280", "laptop1024", "laptopShort"]);
const UNPINNED = new Set(["sidewaysShort"]);

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
        // What is lit, checked where the state changes, once its fades are over: by what shows, not by class. An
        // element shows when it has a box, is visible, and neither it nor any element up to .sl is hidden or faded.
        await Promise.allSettled(root.getAnimations({ subtree: true }).map((x) => x.finished));
        const shown = (e) => {
          if (getComputedStyle(e).visibility !== "visible" || !e.getBoundingClientRect().width) return false;
          for (let x = e; x && x !== root.parentElement; x = x.parentElement) if (getComputedStyle(x).display === "none" || +getComputedStyle(x).opacity < 0.99) return false;
          return true;
        };
        row.routes = [...root.querySelectorAll(".sl-r")].filter(shown).map((g) => g.dataset.lit);
        row.lands = [...root.querySelectorAll(".sl-lands > g")].filter(shown).map((g) => g.dataset.lit);
        row.landsListing = [...root.querySelectorAll(".sl-lands > g")].filter((g) => a !== "" && g.dataset.lit.split(" ").includes(a)).length;
        row.overLand = +getComputedStyle(root.querySelector(".sl-over-land")).opacity;
        row.over = shown(root.querySelector(".sl-over"));
        row.base = shown(root.querySelector(".sl-base"));
        row.caps = [...root.querySelectorAll(".sl-cap-row")].filter(shown).map((c) => c.dataset.lit ?? "overview");
        row.marks = [...root.querySelectorAll(".sl-set.is-active .tmap-mk")].filter(shown).length;
        row.sets = [...root.querySelectorAll(".sl-set")].filter(shown).map((g) => g.dataset.lit);
        row.articles = [...root.querySelectorAll("article.is-active")].map((e) => e.dataset.trip);
        const rail = root.querySelector(".trip-rail-mark.is-active");
        row.rail = rail ? (rail.classList.contains("unknown") ? "hollow" : getComputedStyle(rail).backgroundColor) : null;
        row.labels = [...root.querySelectorAll(".sl-set .tmap-lbl")].filter((l) => l.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && l.getBoundingClientRect().width > 0).length;
        // Every element listing the lit trip is lit, and no other: data-lit is a list of whole trip numbers.
        row.tokens = [...root.querySelectorAll("[data-lit]")].every((e) => e.classList.contains("is-active") === (a !== "" && e.dataset.lit.split(" ").includes(a)));
        // Where the pinned column's parts are, in the scroll area (beside the map) and in the content (stacked).
        const top = sc.getBoundingClientRect().top;
        row.pinned = [".sl-fig", ".sl-legend", ".sl-rail"].map((q) => Math.round(root.querySelector(q).getBoundingClientRect().top - top));
        row.content = [".sl-fig", ".sl-legend", ".sl-rail", ".sl-list"].map((q) => Math.round(root.querySelector(q).getBoundingClientRect().top - top + sc.scrollTop));
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

test("the dialog opens on the overview, however tall the screen: nothing lit, the latest trip in the accent, a word that the map follows", async () => {
  for (const viewport of [VIEWPORTS.laptop, { width: 1920, height: 1200 }, { width: 2560, height: 1440 }, { width: 1024, height: 1366 }]) {
    const name = `${viewport.width}x${viewport.height}`;
    const { page, errors, close } = await open(viewport);
    const dialog = await openDialog(page);
    await page.waitForTimeout(100);
    const root = dialog.locator(".sl");
    assert.equal(await root.getAttribute("data-active-trip"), "", name);
    assert.equal(await root.getAttribute("data-follow"), "", `${name}: the island ran`);
    assert.equal(await dialog.locator(".is-active").count(), 0, name);
    assert.equal(await dialog.locator(`.sl-r.latest`).evaluate((g) => getComputedStyle(g).opacity), "1", name);
    assert.equal(await dialog.locator(`.sl-over-land`).evaluate((g) => getComputedStyle(g).opacity), "1", `${name}: the latest trip's countries`);
    assert.ok(await dialog.locator(".cap-hint").isVisible(), `${name}: the follow hint shows once the island runs`);
    assert.deepEqual(errors, [], name);
    await close();
  }
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
      assert.ok(r.tokens, `${name}: exactly the elements listing trip ${r.a || "(none)"} are lit`);
      assert.equal(r.over, !r.a, `${name}: the overview's marks and labels show only when no trip is lit (${r.a})`);
      assert.equal(r.base, !!r.a, `${name}: the faint marks show under a lit trip (${r.a})`);
      assert.deepEqual(r.caps, [r.a || "overview"], `${name}: one caption line shows, ${r.a || "the overview"}'s`);
      if (!r.a) continue;
      assert.ok(r.marks >= 1, `${name}: trip ${r.a}'s places are marked on the map`);
      const mine = (l) => l.split(" ").includes(r.a);
      assert.ok(r.routes.length === 1 && mine(r.routes[0]), `${name}: one route group shows, trip ${r.a}'s (${r.routes})`);
      assert.ok(r.sets.length === 1 && mine(r.sets[0]), `${name}: one set of marks and labels shows, trip ${r.a}'s (${r.sets})`);
      assert.ok(r.lands.length === r.landsListing && r.lands.every(mine), `${name}: trip ${r.a}'s countries light, and only them (${r.lands})`);
      assert.equal(r.overLand, 0, `${name}: the overview's countries step back while trip ${r.a} is lit`);
      assert.deepEqual(r.articles, [r.a], `${name}: one trip marked in the list`);
      assert.ok(r.rail === "hollow" || r.rail === accentRgb, `${name}: trip ${r.a}'s rail mark is in the accent (${r.rail})`);
      assert.ok(r.labels >= 1, `${name}: trip ${r.a} names a place on the map`);
    }
    // The lit trips that share their routes with others: 1, 2 and 10 go to the same place.
    assert.ok(changes.some((r) => r.a === "10" && r.routes[0] === "1 2 10"), `${name}: a shared route set lights for its last trip`);
    const fixed = (r) => (LAPTOP.has(name) ? r.pinned : UNPINNED.has(name) ? r.content : [r.pinned[0], ...r.content.slice(1)]).join(",");
    assert.equal(new Set(changes.map(fixed)).size, 1, `${name}: lighting a trip moves nothing (${[...new Set(changes.map(fixed))].join(" / ")})`);
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
  for (const name of ["laptop", "laptop1280", "laptop1024", "laptopShort"]) {
    const { page, close } = await open(SWEEP[name]);
    await openDialog(page);
    const sc = page.locator("#dialog-travel [data-scroller]");
    for (const at of [0, 0.5, 1]) {
      await sc.evaluate((e, at) => (e.scrollTop = (e.scrollHeight - e.clientHeight) * at), at);
      await page.waitForTimeout(100);
      const g = await geometry(page);
      assert.ok(g.pin.bottom <= g.sc.bottom + 0.5, `${name} at ${at}: the pinned column fits (${g.pin.bottom} vs ${g.sc.bottom})`);
      assert.ok(g.fig.top >= g.sc.top - 0.5 && g.fig.bottom <= g.sc.bottom + 0.5, `${name} at ${at}: the map stays in the scroll area (${g.fig.top}..${g.fig.bottom} in ${g.sc.top}..${g.sc.bottom})`);
    }
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
  for (const name of ["sideways"]) {
    const { page, close } = await open(SWEEP[name]);
    await openDialog(page);
    await page.locator("#dialog-travel [data-scroller]").evaluate((e) => (e.scrollTop = e.scrollHeight));
    const g = await geometry(page);
    assert.ok(g.fig.right <= g.list.left && g.fig.top >= g.sc.top - 0.5 && g.fig.bottom <= g.sc.bottom + 0.5, `${name}: the map stays in view beside the list ${JSON.stringify(g)}`);
    assert.equal(await overflowX(page), 0, `${name}: no horizontal scroll`);
    await close();
  }
  // Too short to pin a map and read (a 360px phone on its side, a window zoomed to 400%, a laptop with its
  // developer tools docked below): the map scrolls away
  // with the rest, and the caption makes no promise that it follows.
  for (const viewport of [SWEEP.sidewaysShort, { width: 568, height: 320 }, { width: 320, height: 256 }, { width: 1366, height: 330 }]) {
    const name = `${viewport.width}x${viewport.height}`;
    const { page, close } = await open(viewport);
    const dialog = await openDialog(page);
    await page.waitForTimeout(100);
    assert.equal(await dialog.locator(".sl").getAttribute("data-follow"), null, `${name}: no promise`);
    assert.ok(await dialog.locator(".cap-latest").isVisible(), `${name}: the overview names the latest trip instead`);
    await page.locator("#dialog-travel [data-scroller]").evaluate((e) => (e.scrollTop = e.scrollHeight / 2));
    const g = await geometry(page);
    assert.ok(g.fig.bottom < g.sc.top, `${name}: the map has scrolled away (${g.fig.bottom} vs ${g.sc.top})`);
    assert.equal(await overflowX(page), 0, `${name}: no horizontal scroll`);
    await close();
  }
});

test("a trip heading reached by keyboard lights its trip; scrolling on hands the map back to the reading line", async () => {
  for (const name of ["laptop", "phone"]) {
    const { page, errors, close } = await open(SWEEP[name]);
    const dialog = await openDialog(page);
    const root = dialog.locator(".sl");
    const heads = dialog.locator(".trip-h");
    await dialog.locator("button[type=submit]").focus();
    for (let k = 0; k < 5; k++) {
      await page.keyboard.press("Tab");
      const trip = await heads.nth(k).evaluate((h) => h.closest("[data-trip]").dataset.trip);
      assert.equal(await page.evaluate(() => document.activeElement.closest("[data-trip]")?.dataset.trip), trip, `${name}: Tab ${k + 1} reaches trip ${trip}`);
      await page.waitForFunction((t) => document.querySelector("#dialog-travel .sl").dataset.activeTrip === t, trip, { timeout: 2000 });
      // Never under the pinned map.
      const [head, fig] = await Promise.all([heads.nth(k).boundingBox(), dialog.locator(".sl-fig").boundingBox()]);
      if (name === "phone") assert.ok(head.y >= fig.y + fig.height - 1, `${name}: trip ${trip}'s heading clears the map`);
    }
    // Back again with Shift+Tab: the heading lands clear of a pinned map, and lights its trip.
    for (let k = 3; k >= 2; k--) {
      await page.keyboard.press("Shift+Tab");
      const trip = await heads.nth(k).evaluate((h) => h.closest("[data-trip]").dataset.trip);
      await page.waitForFunction((t) => document.querySelector("#dialog-travel .sl").dataset.activeTrip === t, trip, { timeout: 2000 });
      const [head, fig] = await Promise.all([heads.nth(k).boundingBox(), dialog.locator(".sl-fig").boundingBox()]);
      if (name === "phone") assert.ok(head.y >= fig.y + fig.height - 1, `${name}: Shift+Tab to trip ${trip} clears the map`);
    }
    // Back to the second trip, then page on: the focused trip lets go and the line decides.
    await heads.nth(1).focus();
    await page.keyboard.press("PageDown");
    await page.keyboard.press("PageDown");
    // Keyboard scrolling is animated: wait until it has come to rest (unmoved for 120ms), then a frame more.
    await dialog.locator("[data-scroller]").evaluate(
      (e) =>
        new Promise((done) => {
          let y = -1;
          const tick = () => (e.scrollTop === y ? requestAnimationFrame(() => requestAnimationFrame(done)) : ((y = e.scrollTop), setTimeout(tick, 120)));
          tick();
        }),
    );
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

test("a trip heading clicked with the mouse does not hold the map, even once a key scrolls the list", async () => {
  for (const name of ["laptop", "phone"]) {
    const { page, errors, close } = await open(SWEEP[name]);
    const dialog = await openDialog(page);
    const root = dialog.locator(".sl");
    const sc = dialog.locator("[data-scroller]");
    await sc.evaluate((e) => (e.scrollTop = (e.scrollHeight - e.clientHeight) / 3));
    await page.waitForTimeout(100);
    // A heading in view but below the trip being read.
    const k = await page.evaluate(() => {
      const sc = document.querySelector("#dialog-travel [data-scroller]").getBoundingClientRect();
      const fig = document.querySelector("#dialog-travel .sl-fig").getBoundingClientRect();
      const lit = document.querySelector("#dialog-travel .sl").dataset.activeTrip;
      return [...document.querySelectorAll("#dialog-travel .trip-h")].findIndex((h) => {
        const r = h.getBoundingClientRect();
        return h.closest("[data-trip]").dataset.trip !== lit && r.top > Math.max(sc.top, fig.bottom) && r.bottom < sc.bottom - 40;
      });
    });
    assert.ok(k >= 0, `${name}: a heading to click`);
    await dialog.locator(".trip-h").nth(k).click();
    for (let n = 0; n < 3; n++) await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(400);
    const lit = await root.getAttribute("data-active-trip");
    await dialog.locator("button[type=submit]").focus();
    await page.waitForTimeout(150);
    assert.equal(lit, await root.getAttribute("data-active-trip"), `${name}: the line decides, not the clicked heading`);
    assert.deepEqual(errors, [], `${name}: no errors`);
    await close();
  }
});

test("opening, closing and reopening the dialog raises no error, not even a ResizeObserver loop", async () => {
  // Heights where, without the island's guard, each open measured the closed dialog and looped (found by a scan).
  for (const viewport of [{ width: 1024, height: 580 }, { width: 1366, height: 612 }, { width: 1024, height: 668 }, VIEWPORTS.laptop, VIEWPORTS.phone]) {
    const name = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport });
    // Errors that reach window.onerror (error monitoring) but not Playwright's pageerror, like the ResizeObserver loop.
    await context.addInitScript(() => {
      window.__errors = [];
      window.addEventListener("error", (e) => window.__errors.push(String(e.message)));
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    for (let k = 0; k < 3; k++) {
      const dialog = await openDialog(page);
      await page.waitForTimeout(150);
      await dialog.locator("button[type=submit]").click();
      await dialog.waitFor({ state: "hidden" });
    }
    assert.deepEqual(await page.evaluate(() => window.__errors), [], name);
    await context.close();
  }
});
