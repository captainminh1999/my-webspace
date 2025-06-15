import type { Handler, HandlerEvent } from "@netlify/functions";
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

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const widget = event.queryStringParameters?.widget;
  if (!widget || !ALLOWED_WIDGETS.includes(widget)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Invalid or missing widget" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const doc = await db.collection("widgets").findOne({ _id: widget });
    if (!doc) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not Found" }),
        headers: { "Content-Type": "application/json" },
      };
    }
    const { _id, ...data } = doc as any;
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err: any) {
    console.error("Error fetching widget", widget, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };
