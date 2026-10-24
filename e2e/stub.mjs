// e2e/stub.mjs — stands in for the site's Netlify functions on :8888 during the browser tests, so `next build` and
// `next start` render the Travel card from e2e/fixtures/journeys.json (invented trips, not the owner's) and every
// other read comes back empty. src/lib/payload.ts sends reads to localhost:8888 when no database or base URL is set.
import http from "node:http";
import { readFileSync } from "node:fs";

const journeys = JSON.parse(readFileSync(new URL("./fixtures/journeys.json", import.meta.url), "utf8"));
const port = Number(process.env.E2E_STUB_PORT ?? 8888);

http
  .createServer((req, res) => {
    const all = req.url?.startsWith("/.netlify/functions/get-all-widgets");
    res.writeHead(all ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify(all ? { travel: journeys } : { message: "not stubbed" }));
  })
  .listen(port, () => console.log(`e2e stub on :${port}`));
