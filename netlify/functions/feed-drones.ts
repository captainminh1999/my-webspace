// Scheduled feed: drones (06:00 UTC). Runs only while FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { drones } from "./feeds/sources";

const handler = async () => runFeed("drones", drones);
export default handler;

export const config: Config = { schedule: "0 6 * * *" };
