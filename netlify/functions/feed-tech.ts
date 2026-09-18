// Scheduled feed: tech (every 3 hours). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { tech } from "./feeds/sources";

const handler = async () => runFeed("tech", tech);
export default handler;

// TEMPORARY (2026-09-19): one extra run to confirm the keyless feed (normal: "0 */3 * * *"); restored in the next commit.
export const config: Config = { schedule: "2 23 * * *" };
