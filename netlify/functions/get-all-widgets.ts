import type { Handler } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";
import { ALLOWED_WIDGETS, fetchWidget, fetchMeta } from "../../src/lib/widgetQueries";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const result: Record<string, any> = {};
    const [docs, meta] = await Promise.all([
      Promise.all(ALLOWED_WIDGETS.map((widget) => fetchWidget(db, widget))),
      fetchMeta(db),
    ]);
    ALLOWED_WIDGETS.forEach((widget, i) => {
      if (docs[i] !== null) result[widget] = docs[i];
    });
    if (meta) result.meta = meta;
    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  } catch (err: any) {
    console.error("Error fetching widgets", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message }),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  }
};

export { handler };
