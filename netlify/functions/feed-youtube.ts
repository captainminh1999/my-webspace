// Scheduled feed: youtube (02:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { youtube } from "./feeds/sources";

const handler = async () => runFeed("youtube", youtube);
export default handler;

// TEMPORARY (2026-09-19): one extra run to test YOUTUBE_KEY (normal: "0 2 * * *"); restored in the next commit.
export const config: Config = { schedule: "52 22 * * *" };
