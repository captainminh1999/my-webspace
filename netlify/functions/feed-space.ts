// Scheduled feed: space (08:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { space } from "./feeds/sources";

const handler = async () => runFeed("space", space);
export default handler;

// TEMPORARY (2026-09-19): one extra run at 22:31 UTC to test NASA_KEY (normal: "0 8 * * *"); restored in the next commit.
export const config: Config = { schedule: "31 22 * * *" };
