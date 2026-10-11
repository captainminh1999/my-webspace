// Server-side data for the home page.
//
// Production (Netlify) has MONGODB_URI, so the page reads MongoDB directly:
// no HTTP hop through the site's own functions, no dependency on the previous
// deploy at build time, and no headers() call — so `revalidate = 60` on `/`
// actually applies. Local development usually has no MONGODB_URI; then the
// same shape is assembled over HTTP from the deployed functions at
// NEXT_PUBLIC_BASE_URL (see .env.example).
import type { MongoClient } from "mongodb";
import { connectToDatabase } from "./mongodb";
import { getProfile } from "./cv";
import { baseUrl, decodeStrings } from "./payload";
import { fetchHome } from "./widgetQueries";
import { parseStops } from "@/utils/travel";
import { WIDGET_IDS, type DashboardData, type WidgetId } from "@/types/dashboard";

/** Everything but the profile, which comes from the CV reader already decoded. */
type Feeds = Omit<DashboardData, "renderedAt" | "profile">;

const EMPTY: Feeds = {
  weather: null,
  tech: [],
  space: null,
  camera: null,
  coffee: [],
  verse: null,
  games: [],
  youtube: null,
  meta: null,
  travel: [],
};

async function fromMongo(client: MongoClient): Promise<Feeds> {
  const db = client.db(process.env.MONGODB_DB || "cv");
  const { widgets, meta, travel } = await fetchHome(db);
  const out: Record<string, unknown> = { ...EMPTY, meta, travel: parseStops(travel) };
  for (const id of WIDGET_IDS) if (widgets[id] !== null) out[id] = widgets[id];
  return out as Feeds;
}

async function fromFunctions(): Promise<Feeds> {
  const res = await fetch(`${baseUrl()}/.netlify/functions/get-all-widgets`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`get-all-widgets ${res.status}`);
  const all = (await res.json()) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...EMPTY };
  for (const id of WIDGET_IDS as readonly WidgetId[]) if (all[id] != null) out[id] = all[id];
  if (all.meta != null) out.meta = all.meta;
  out.travel = parseStops(all.travel);
  return out as Feeds;
}

export async function getDashboardData(): Promise<DashboardData> {
  const renderedAt = new Date().toISOString();
  // One connection attempt for the whole page: the profile read below (and the layout's title) wait on
  // this same promise, so if the cluster cannot be reached the page gives up once, not once per reader.
  const connecting = process.env.MONGODB_URI ? connectToDatabase() : null;
  connecting?.catch(() => {}); // a failure is handled where it is awaited, below
  // The profile first, and on its own: the layout's title asks for the same one, so this is the read they
  // share (getProfile never throws). The feeds' read waits for it rather than racing it — on a cold
  // connection a second command at the same time would open a second connection to the cluster.
  const profile = await getProfile();
  try {
    const data = connecting ? await fromMongo(await connecting) : await fromFunctions();
    // Decode per key so one malformed string in one feed cannot blank the others.
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      try {
        out[k] = decodeStrings(v);
      } catch (err) {
        console.error(`Could not decode ${k}`, err);
        out[k] = (EMPTY as Record<string, unknown>)[k];
      }
    }
    return { ...(out as Feeds), profile, renderedAt };
  } catch (err) {
    // Render the shell with empty cards rather than a 500; every card has an empty state.
    console.error("Dashboard data unavailable", err);
    return { ...EMPTY, profile, renderedAt };
  }
}
