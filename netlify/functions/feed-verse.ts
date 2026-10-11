// Scheduled feed: verse of the day (19:05 and 21:05 UTC = 05:05 and 07:05 in Sydney, an hour later in summer).
// Both runs fall on the same Sydney day, far from any US midnight where the upstream verse changes, so the
// second is a self-heal. Five past, not on the hour: tech runs at 21:00, and two feeds refreshing the home page
// at once would each purge the copy the other has just rendered (feeds/refresh.ts). Runs only while
// FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { verse } from "./feeds/sources";

const handler = async () => runFeed("verse", verse);
export default handler;

export const config: Config = { schedule: "5 19,21 * * *" };
