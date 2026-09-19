// Scheduled feed: verse of the day (19:00 and 21:00 UTC = 05:00 and 07:00 in Sydney, an hour later in summer).
// Both runs fall on the same Sydney day, far from any US midnight where the upstream verse changes, so the
// second is a self-heal. Runs only while FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { verse } from "./feeds/sources";

const handler = async () => runFeed("verse", verse);
export default handler;

export const config: Config = { schedule: "0 19,21 * * *" };
