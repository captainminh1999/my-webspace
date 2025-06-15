import type { Db } from "mongodb";

export const ALLOWED_WIDGETS = [
  "coffee",
  "weather",
  "space",
  "tech",
  "youtube",
  "drones",
  "camera",
  "games",
] as const;

export async function fetchWidget(db: Db, widget: string): Promise<any> {
  const singletons = db.collection("singletons");
  switch (widget) {
    case "coffee":
      return (await db.collection("coffee").find({}).toArray()).map(({ _id, ...r }) => r);
    case "weather": {
      const doc = await singletons.findOne({ _id: "weather" });
      if (!doc) return null;
      const { _id, ...rest } = doc as any;
      return rest;
    }
    case "space": {
      const [space, epic, marsPhoto, marsWeather] = await Promise.all([
        singletons.findOne({ _id: "space" }),
        singletons.findOne({ _id: "epic" }),
        singletons.findOne({ _id: "marsPhoto" }),
        singletons.findOne({ _id: "marsWeather" }),
      ]);
      return {
        space: space ? (({ _id, ...r }) => r)(space as any) : null,
        epic: epic ? (({ _id, ...r }) => r)(epic as any) : null,
        mars: marsPhoto ? (({ _id, ...r }) => r)(marsPhoto as any) : null,
        marsWeather: marsWeather ? (({ _id, ...r }) => r)(marsWeather as any) : null,
      };
    }
    case "tech":
      return (await db.collection("tech").find({}).toArray()).map(({ _id, ...r }) => r);
    case "youtube": {
      const doc = await singletons.findOne({ _id: "youtubeRecs" });
      if (!doc) return null;
      const { _id, ...rest } = doc as any;
      return rest;
    }
    case "drones":
      return (await db.collection("droneNews").find({}).toArray()).map(({ _id, ...r }) => r);
    case "camera": {
      const doc = await singletons.findOne({ _id: "photography" });
      if (!doc) return null;
      const { _id, ...rest } = doc as any;
      return rest;
    }
    case "games":
      return (await db.collection("games").find({}).toArray()).map(({ _id, ...r }) => r);
    default:
      return null;
  }
}
