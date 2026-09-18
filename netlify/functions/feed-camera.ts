// Scheduled feed: camera (08:00 UTC). Dormant until FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { camera } from "./feeds/sources";

const handler = async () => runFeed("camera", camera);
export default handler;

export const config: Config = { schedule: "0 8 * * *" };
