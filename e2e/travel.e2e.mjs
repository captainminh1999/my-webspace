// e2e/travel.e2e.mjs — the Travel card and dialog in a real browser, against `next start` rendering
// e2e/fixtures/journeys.json (run by scripts/e2e.mjs). Five invented trips, 2016-2025: one without a month,
// side trips by land, and empty years in between.
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
    assert.match(text, /2020 – 2022 · No journeys/i, `${name}: the empty years`);
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
