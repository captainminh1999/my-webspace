import type { Handler } from "@netlify/functions";
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
    const result: any = {};

    for (const section of ALLOWED_SECTIONS) {
      if (SINGLETON_SECTIONS.has(section)) {
        const doc = await db.collection("singletons").findOne({ _id: section });
        if (doc) {
          const { _id, ...rest } = doc as any;
          result[section] = rest;
        } else {
          result[section] = null;
        }
      } else {
        const docs = await db.collection(section).find({}).toArray();
        result[section] = docs.map(({ _id, ...rest }) => rest);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  } catch (err: any) {
    console.error("Error fetching full CV data:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database error", error: err.message }),
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    };
  }
};

export { handler };
