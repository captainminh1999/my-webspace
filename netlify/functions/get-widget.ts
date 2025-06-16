import type { Handler, HandlerEvent } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";
import { ALLOWED_WIDGETS, fetchWidget } from "./widget-utils";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  }

  const widget = event.queryStringParameters?.widget as string | undefined;
  if (!widget || !(ALLOWED_WIDGETS as readonly string[]).includes(widget)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Invalid or missing widget" }),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const data = await fetchWidget(db, widget);
    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not Found" }),
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  } catch (err: any) {
    console.error("Error fetching widget", widget, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message }),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  }
};

export { handler };
