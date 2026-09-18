// Scheduled feed: coffee (05:00 UTC). Runs only while FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { coffee } from "./feeds/sources";

const handler = async () => runFeed("coffee", coffee);
export default handler;

export const config: Config = { schedule: "0 5 * * *" };
