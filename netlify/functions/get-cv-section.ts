import type { Handler, HandlerEvent } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";

const ALLOWED_SECTIONS = [
  "profile",
  "about",
  "experience",
  "education",
  "licenses",
  "projects",
  "volunteering",
  "skills",
  "recommendationsGiven",
  "recommendationsReceived",
  "honorsAwards",
  "languages",
];

const SINGLETON_SECTIONS = new Set(["profile", "about"]);

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const section = event.queryStringParameters?.section;
  if (!section || !ALLOWED_SECTIONS.includes(section)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Invalid or missing section" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    let data: any;

    if (SINGLETON_SECTIONS.has(section)) {
      const doc = await db.collection("singletons").findOne({ _id: section });
      if (doc) {
        const { _id, ...rest } = doc as any;
        data = rest;
      } else {
        data = null;
      }
    } else {
      const docs = await db.collection(section).find({}).toArray();
      data = docs.map(({ _id, ...rest }) => rest);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err: any) {
    console.error("Error fetching section", section, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };
