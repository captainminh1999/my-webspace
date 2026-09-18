// Scheduled feed: games (04:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { games } from "./feeds/sources";

const handler = async () => runFeed("games", games);
export default handler;

// TEMPORARY (2026-09-19): one extra run at 22:32 UTC to test RAWG_KEY (normal: "0 4 * * *"); restored in the next commit.
export const config: Config = { schedule: "32 22 * * *" };
