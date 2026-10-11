// Scheduled feed: space (08:05 UTC — five past, so it does not refresh the home page in the same minute as
// camera at 08:00; see feeds/refresh.ts). Runs only while FEEDS_VIA_NETLIFY=true — see feeds/lib.ts.
import type { Config } from "@netlify/functions";
import { runFeed } from "./feeds/lib";
import { space } from "./feeds/sources";

const handler = async () => runFeed("space", space);
export default handler;

export const config: Config = { schedule: "5 8 * * *" };
