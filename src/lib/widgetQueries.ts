// The single source of truth for "which MongoDB documents make up widget X".
// Used directly by the Next.js server (src/lib/dashboard.ts) and by the
// Netlify functions (netlify/functions/widget-utils.ts).
import type { Db, Document, WithId } from "mongodb";
// Relative on purpose: this module is bundled into the Netlify functions, where the @/ alias is not guaranteed.
import { WIDGET_IDS, type WidgetId } from "../types/dashboard";

export const ALLOWED_WIDGETS = WIDGET_IDS;

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

export async function fetchWidget(db: Db, widget: string): Promise<unknown> {
  const singletons = db.collection("singletons");
  switch (widget as WidgetId) {
    case "coffee":
      return list(db, "coffee");
    case "tech":
      return list(db, "tech");
    case "drones":
      return list(db, "droneNews");
    case "games":
      return list(db, "games");
    case "weather":
      return stripId(await singletons.findOne({ _id: "weather" as unknown as never }));
    case "youtube":
      return stripId(await singletons.findOne({ _id: "youtubeRecs" as unknown as never }));
    case "camera":
      return stripId(await singletons.findOne({ _id: "photography" as unknown as never }));
    case "space": {
      const [space, epic, marsPhoto, marsWeather] = await Promise.all(
        ["space", "epic", "marsPhoto", "marsWeather"].map((id) =>
          singletons.findOne({ _id: id as unknown as never }),
        ),
      );
      return {
        space: stripId(space),
        epic: stripId(epic),
        mars: stripId(marsPhoto),
        marsWeather: stripId(marsWeather),
      };
    }
    default:
      return null;
  }
}

/** The meta singleton (feed fetch times) and the profile, read alongside the widgets. */
export async function fetchMeta(db: Db) {
  return stripId(await db.collection("singletons").findOne({ _id: "meta" as unknown as never }));
}

export async function fetchProfile(db: Db) {
  return stripId(await db.collection("singletons").findOne({ _id: "profile" as unknown as never }));
}
