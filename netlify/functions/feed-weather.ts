// Scheduled feed: weather (hourly at :10 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { weather } from "./feeds/sources";

const handler = async () => runFeed("weather", weather);
export default handler;

export const config: Config = { schedule: "10 * * * *" };
