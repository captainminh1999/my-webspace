// Scheduled feed: drones (06:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { drones } from "./feeds/sources";

const handler = async () => runFeed("drones", drones);
export default handler;

// TEMPORARY (2026-09-19): one extra run to test NEWSAPI_KEY (normal: "0 6 * * *"); restored in the next commit.
export const config: Config = { schedule: "1 23 * * *" };
