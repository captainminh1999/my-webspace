// scripts/e2e.mjs — the browser tests: start the functions stub (e2e/stub.mjs), build the site against it unless
// E2E_SKIP_BUILD is set (CI builds in its own step, with the stub already running), start it, run e2e/*.e2e.mjs
// with node:test, and stop everything. No database and no secret: MONGODB_URI is removed from every child's env.
//
//   npm run test:e2e                  # build and test
//   E2E_SKIP_BUILD=1 npm run test:e2e # test the build already in .next
//
// Chromium: Playwright's own (CI runs `npx playwright install chromium`), or the one at PLAYWRIGHT_CHROMIUM
// (default /opt/pw-browsers/chromium when it exists).
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", E2E_URL: `http://localhost:${PORT}` };
delete env.MONGODB_URI;
delete env.NEXT_PUBLIC_BASE_URL;
delete env.URL;
if (!env.PLAYWRIGHT_CHROMIUM && existsSync("/opt/pw-browsers/chromium")) env.PLAYWRIGHT_CHROMIUM = "/opt/pw-browsers/chromium";

const children = [];
// Each child leads its own process group, so stopping it also stops what it started (`npx next start` runs
// next-server as a grandchild, which would otherwise outlive this script and keep the port).
const start = (cmd, args) => {
  const child = spawn(cmd, args, { env, stdio: "inherit", detached: true });
  children.push(child);
  return child;
};
const run = (cmd, args) =>
  new Promise((resolve, reject) => start(cmd, args).on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)))));
const stop = () =>
  children.forEach((c) => {
    try {
      process.kill(-c.pid, "SIGTERM");
    } catch {
      // already gone
    }
  });
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));

async function up(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not come up in ${ms / 1000} s`);
}

try {
  start("node", ["e2e/stub.mjs"]);
  await up("http://localhost:8888/.netlify/functions/get-all-widgets", 10_000);
  if (!process.env.E2E_SKIP_BUILD) await run("npx", ["next", "build"]);
  start("npx", ["next", "start", "-p", String(PORT)]);
  await up(env.E2E_URL, 60_000);
  const files = readdirSync("e2e").filter((f) => f.endsWith(".e2e.mjs")).map((f) => `e2e/${f}`);
  await run("node", ["--test", "--test-concurrency=1", ...files]);
  stop();
  process.exit(0);
} catch (err) {
  console.error(err.message);
  stop();
  process.exit(1);
}
