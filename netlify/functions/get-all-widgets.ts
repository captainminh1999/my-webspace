import type { Handler } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";

const ALLOWED_WIDGETS = [
  "coffee",
  "weather",
  "space",
  "tech",
  "youtube",
  "drones",
  "camera",
  "games",
];

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const docs = await db
      .collection("widgets")
      .find({ _id: { $in: ALLOWED_WIDGETS } })
      .toArray();
    const result: Record<string, any> = {};
    for (const doc of docs) {
      const { _id, ...rest } = doc as any;
      result[_id as string] = rest;
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err: any) {
    console.error("Error fetching widgets", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };
