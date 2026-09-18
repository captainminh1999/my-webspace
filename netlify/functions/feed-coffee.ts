// Scheduled feed: coffee (05:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { coffee } from "./feeds/sources";

const handler = async () => runFeed("coffee", coffee);
export default handler;

// TEMPORARY (2026-09-19): one extra run to test NEWSAPI_KEY (normal: "0 5 * * *"); restored in the next commit.
export const config: Config = { schedule: "0 23 * * *" };
