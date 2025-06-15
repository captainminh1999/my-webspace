import type { Handler } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";
import { ALLOWED_WIDGETS, fetchWidget } from "./widget-utils";

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
    const result: Record<string, any> = {};
    for (const widget of ALLOWED_WIDGETS) {
      const data = await fetchWidget(db, widget);
      if (data !== null) {
        result[widget] = data;
      }
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
