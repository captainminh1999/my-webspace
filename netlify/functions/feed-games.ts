// Scheduled feed: games (04:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { games } from "./feeds/sources";

const handler = async () => runFeed("games", games);
export default handler;

export const config: Config = { schedule: "0 4 * * *" };
