// The single source of truth for "which MongoDB documents make up widget X".
// Used directly by the Next.js server (src/lib/dashboard.ts) and by the
// Netlify functions (netlify/functions/get-widget.ts, get-all-widgets.ts).
import type { Db, Document, WithId } from "mongodb";
// Relative on purpose: this module is bundled into the Netlify functions, where the @/ alias is not guaranteed.
import { WIDGET_IDS, type WidgetId } from "../types/dashboard";

export const ALLOWED_WIDGETS = WIDGET_IDS;

/** A widget is a list collection, one singleton, or (space) several singletons under their own keys. */
type Source = { list: string } | { one: string } | { parts: Record<string, string> };

const SOURCES: Record<WidgetId, Source> = {
  coffee: { list: "coffee" },
  tech: { list: "tech" },
  verse: { one: "verse" },
  games: { list: "games" },
  weather: { one: "weather" },
  youtube: { one: "youtubeRecs" },
  camera: { one: "photography" },
  space: { parts: { space: "space", epic: "epic", mars: "marsPhoto", marsWeather: "marsWeather" } },
};

function stripId<T extends Document>(doc: WithId<T> | null): Omit<T, "_id"> | null {
  if (!doc) return null;
  const { _id: _ignored, ...rest } = doc;
  void _ignored;
  return rest as Omit<T, "_id">;
}

/** In the order the feed wrote them: insertMany numbers its _ids in array order, and a bare find() promises no order at all. */
async function list(db: Db, collection: string) {
  return (await db.collection(collection).find({}).sort({ _id: 1 }).toArray()).map((d) => stripId(d));
}

const single = (db: Db, id: string) => db.collection("singletons").findOne({ _id: id as unknown as never });

export async function fetchWidget(db: Db, widget: string): Promise<unknown> {
  const source = Object.hasOwn(SOURCES, widget) ? SOURCES[widget as WidgetId] : undefined; // not "constructor" & co.
  if (!source) return null;
  if ("list" in source) return list(db, source.list);
  if ("one" in source) return stripId(await single(db, source.one));
  const keys = Object.keys(source.parts);
  const docs = await Promise.all(keys.map((k) => single(db, source.parts[k])));
  return Object.fromEntries(keys.map((k, i) => [k, stripId(docs[i])]));
}

/** The meta singleton (feed fetch times), read alongside the widgets. */
export async function fetchMeta(db: Db) {
  return stripId(await single(db, "meta"));
}

/**
 * Every widget and the meta singleton in ONE command — what the Daily Dash renders (the profile
 * comes from src/lib/cv.ts getProfile). Read as 12 separate finds they went out at once (13 with the profile),
 * and on a cold connection pool each extra command waits for a connection of its own: TCP, TLS
 * and SCRAM to the cluster in Sydney, about four round trips from the function in us-east-1.
 * Same shapes as fetchWidget: a missing singleton is null, a list keeps the order it was written in.
 */
export async function fetchHome(db: Db): Promise<{ widgets: Record<WidgetId, unknown>; meta: Document | null }> {
  const sources = Object.values(SOURCES);
  const singles = [
    "meta",
    ...sources.flatMap((s) => ("one" in s ? [s.one] : "parts" in s ? Object.values(s.parts) : [])),
  ];
  const lists = sources.flatMap((s) => ("list" in s ? [s.list] : []));
  // Each document travels wrapped with the collection it came from, so no field of its own is touched.
  const rows = await db
    .collection("singletons")
    .aggregate<{ from: string; doc: WithId<{ _id: unknown }> }>([
      { $match: { _id: { $in: singles } } },
      { $replaceWith: { from: "singletons", doc: "$$ROOT" } },
      ...lists.map((coll) => ({ $unionWith: { coll, pipeline: [{ $replaceWith: { from: coll, doc: "$$ROOT" } }] } })),
      // A union promises no order. Rows are picked out by `from` below, so only the order within a list
      // matters: by _id, which follows the write order, as in list().
      { $sort: { "doc._id": 1 } },
    ])
    .toArray();

  const one = (id: string) => stripId(rows.find((r) => r.from === "singletons" && r.doc._id === id)?.doc ?? null);
  const widgets = {} as Record<WidgetId, unknown>;
  for (const id of WIDGET_IDS) {
    const s = SOURCES[id];
    widgets[id] =
      "list" in s
        ? rows.filter((r) => r.from === s.list).map((r) => stripId(r.doc))
        : "one" in s
          ? one(s.one)
          : Object.fromEntries(Object.entries(s.parts).map(([k, singleton]) => [k, one(singleton)]));
  }
  return { widgets, meta: one("meta") };
}
