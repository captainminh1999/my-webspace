// Scheduled feed: weather (hourly at :10 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { weather } from "./feeds/sources";

const handler = async () => runFeed("weather", weather);
export default handler;

// TEMPORARY (2026-09-19): one extra run at 22:33 UTC to test WEATHER_KEY (normal: "10 * * * *"); restored in the next commit.
export const config: Config = { schedule: "33 22 * * *" };
