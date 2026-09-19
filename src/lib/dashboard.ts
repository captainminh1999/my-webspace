// Server-side data for the home page.
//
// Production (Netlify) has MONGODB_URI, so the page reads MongoDB directly:
// no HTTP hop through the site's own functions, no dependency on the previous
// deploy at build time, and no headers() call — so `revalidate = 60` on `/`
// actually applies. Local development usually has no MONGODB_URI; then the
// same shape is assembled over HTTP from the deployed functions at
// NEXT_PUBLIC_BASE_URL (see .env.example).
import { connectToDatabase } from "./mongodb";
import { fetchMeta, fetchProfile, fetchWidget } from "./widgetQueries";
import { WIDGET_IDS, type DashboardData, type WidgetId } from "@/types/dashboard";
import type { ProfileData } from "@/types";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** YouTube titles arrive HTML-escaped ("I Couldn&#39;t…"); decode every string in a payload. */
export function decodeStrings<T>(input: T): T {
  if (typeof input === "string") {
    return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, code: string) => {
      if (ENTITIES[match]) return ENTITIES[match];
      if (code[0] === "#") {
        const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isNaN(n) || n > 0x10ffff ? match : String.fromCodePoint(n);
      }
      return match;
    }) as unknown as T;
  }
  if (Array.isArray(input)) return input.map((v) => decodeStrings(v)) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) out[k] = decodeStrings(v);
    return out as T;
  }
  return input;
}

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.URL ||
    "http://localhost:8888"
  ).replace(/\/$/, "");
}

const EMPTY: Omit<DashboardData, "renderedAt"> = {
  weather: null,
  tech: [],
  space: null,
  camera: null,
  coffee: [],
  verse: null,
  games: [],
  youtube: null,
  meta: null,
  profile: null,
};

async function fromMongo(): Promise<Omit<DashboardData, "renderedAt">> {
  const client = await connectToDatabase();
  const db = client.db(process.env.MONGODB_DB || "cv");
  const [widgets, meta, profile] = await Promise.all([
    Promise.all(WIDGET_IDS.map((id) => fetchWidget(db, id))),
    fetchMeta(db),
    fetchProfile(db),
  ]);
  const out: Record<string, unknown> = { ...EMPTY, meta, profile };
  WIDGET_IDS.forEach((id, i) => {
    if (widgets[i] !== null) out[id] = widgets[i];
  });
  return out as Omit<DashboardData, "renderedAt">;
}

async function fromFunctions(): Promise<Omit<DashboardData, "renderedAt">> {
  const base = baseUrl();
  const [all, profile] = await Promise.all([
    fetch(`${base}/.netlify/functions/get-all-widgets`, { next: { revalidate: 60 } }).then((r) =>
      r.ok ? (r.json() as Promise<Record<string, unknown>>) : Promise.reject(new Error(`get-all-widgets ${r.status}`)),
    ),
    fetch(`${base}/.netlify/functions/get-cv-section?section=profile`, { next: { revalidate: 60 } })
      .then((r) => (r.ok ? (r.json() as Promise<ProfileData | null>) : null))
      .catch(() => null),
  ]);
  const out: Record<string, unknown> = { ...EMPTY, profile };
  for (const id of WIDGET_IDS as readonly WidgetId[]) if (all[id] != null) out[id] = all[id];
  if (all.meta != null) out.meta = all.meta;
  return out as Omit<DashboardData, "renderedAt">;
}

export async function getDashboardData(): Promise<DashboardData> {
  const renderedAt = new Date().toISOString();
  try {
    const data = process.env.MONGODB_URI ? await fromMongo() : await fromFunctions();
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
    return { ...(out as Omit<DashboardData, "renderedAt">), renderedAt };
  } catch (err) {
    // Render the shell with empty cards rather than a 500; every card has an empty state.
    console.error("Dashboard data unavailable", err);
    return { ...EMPTY, renderedAt };
  }
}
