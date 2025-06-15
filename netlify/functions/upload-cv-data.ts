// netlify/functions/upload-cv-data.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import Papa from "papaparse";
import { connectToDatabase } from "../../src/lib/mongodb";

interface UploadPayload {
  sectionIdentifier: string;
  fileContentBase64: string;
  fileName: string;
  secretKey?: string;
}

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

const toCamelCase = (str: string): string => {
  if (!str) return "";
  let s = str
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  return s.charAt(0).toLowerCase() + s.slice(1);
};

const transformCause = (rawCause?: string | null): string | null => {
  if (!rawCause) return null;
  const causeMap: { [key: string]: string } = {
    economicempowerment: "Economic Empowerment",
    scienceandtechnology: "Science and Technology",
  };
  const SANE_KEY = rawCause.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    causeMap[SANE_KEY] ||
    rawCause.replace(/([A-Z0-9])/g, " $1").replace(/^./, (char) => char.toUpperCase()).trim()
  );
};

const convertPrimitivesToStrings = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map((item) => convertPrimitivesToStrings(item));
  } else if (typeof data === "object" && data !== null) {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = convertPrimitivesToStrings(data[key]);
      }
    }
    return newData;
  } else if (data !== null && typeof data !== "undefined") {
    return String(data);
  }
  return data;
};

const normaliseArray = (arr: any[]): any[] =>
  arr.map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? item : { value: item }));

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  let payload: UploadPayload;
  try {
    if (!event.body) throw new Error("Request body is empty.");
    payload = JSON.parse(event.body) as UploadPayload;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid JSON payload." }) };
  }

  const UPLOAD_SECRET_KEY = process.env.UPLOAD_SECRET_KEY;
  if (UPLOAD_SECRET_KEY && payload.secretKey !== UPLOAD_SECRET_KEY) {
    return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: Invalid secret key." }) };
  }

  if (!ALLOWED_SECTIONS.includes(payload.sectionIdentifier)) {
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid section identifier." }) };
  }

  let csvContent: string;
  try {
    csvContent = Buffer.from(payload.fileContentBase64, "base64").toString("utf-8");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid file content encoding." }) };
  }

  let parsedData: any[] = [];
  try {
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => toCamelCase(header),
      transform: (value, header) => {
        const h = toCamelCase(header as string);
        const requiredStringFields = [
          "firstName",
          "lastName",
          "headline",
          "title",
          "name",
          "authority",
          "schoolName",
          "startDate",
          "endDate",
          "text",
          "creationDate",
          "issuedOn",
          "proficiency",
          "description",
          "role",
          "companyName",
        ];
        if (value === "" && !requiredStringFields.includes(h)) {
          return null;
        }
        return value;
      },
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV Parsing warnings/errors:", parseResult.errors);
    }
    parsedData = parseResult.data as any[];
  } catch (err: any) {
    console.error("Error parsing CSV:", err);
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Could not parse CSV." }) };
  }

  const processedData = convertPrimitivesToStrings(parsedData);
  let finalJsonData: any;

  try {
    if (payload.sectionIdentifier === "profile") {
      if (processedData.length === 0) throw new Error("Profile CSV is empty or invalid.");
      const profileObject = { ...processedData[0] };
      const summaryForAbout = profileObject.summary || "";
      delete profileObject.summary;

      if (profileObject.websites && typeof profileObject.websites === "string") {
        profileObject.websites = profileObject.websites
          .split(/[,;]/)
          .map((url: string) => url.trim())
          .filter((url: string) => url);
      } else if (!profileObject.websites) {
        profileObject.websites = [];
      }

      finalJsonData = { profile: profileObject, about: { content: String(summaryForAbout) } };
    } else if (payload.sectionIdentifier === "skills") {
      finalJsonData = processedData
        .map((row: any) => String(row.skillName || Object.values(row)[0] || ""))
        .filter(Boolean);
    } else if (payload.sectionIdentifier === "volunteering") {
      finalJsonData = processedData.map((item: any) => ({
        ...item,
        cause: transformCause(item.cause),
      }));
    } else if (payload.sectionIdentifier === "experience") {
      const companies: { [key: string]: any } = {};
      processedData.forEach((row: any) => {
        const companyName = row.companyName;
        if (!companyName) return;
        if (!companies[companyName]) {
          companies[companyName] = {
            companyName,
            employmentType: row.employmentType || null,
            totalDurationAtCompany: row.companyTotalDuration || row.totalDurationAtCompany || null,
            location: row.companyLocation || row.location || null,
            roles: [],
          };
        }
        let responsibilitiesArray: string[] = [];
        if (row.responsibilities) {
          responsibilitiesArray = typeof row.responsibilities === "string"
            ? row.responsibilities.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(row.responsibilities)
            ? row.responsibilities.map(String)
            : [];
        } else {
          responsibilitiesArray = Object.keys(row)
            .filter((key) => key.startsWith("responsibility") && row[key])
            .map((key) => String(row[key]));
        }

        let skillsArray: string[] = [];
        if (row.skills && typeof row.skills === "string") {
          skillsArray = row.skills.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(row.skills)) {
          skillsArray = row.skills.map(String);
        }

        companies[companyName].roles.push({
          title: row.roleTitle || row.title,
          startDate: row.roleStartDate || row.startDate,
          endDate: row.roleEndDate || row.endDate,
          duration: row.roleDuration || row.duration || null,
          responsibilities: responsibilitiesArray,
          skills: skillsArray,
          location: row.roleLocation || null,
        });
      });
      finalJsonData = Object.values(companies);
    } else {
      finalJsonData = processedData.length === 1 && payload.sectionIdentifier === "about" ? processedData[0] : processedData;
    }
  } catch (err: any) {
    console.error(`Error processing section ${payload.sectionIdentifier}:`, err);
    return { statusCode: 500, body: JSON.stringify({ message: `Error processing CSV: ${err.message}` }) };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");

    if (payload.sectionIdentifier === "profile") {
      await db.collection("singletons").updateOne({ _id: "profile" }, { $set: finalJsonData.profile }, { upsert: true });
      await db.collection("singletons").updateOne({ _id: "about" }, { $set: finalJsonData.about }, { upsert: true });
    } else if (SINGLETON_SECTIONS.has(payload.sectionIdentifier)) {
      await db.collection("singletons").updateOne({ _id: payload.sectionIdentifier }, { $set: finalJsonData }, { upsert: true });
    } else {
      const coll = db.collection(payload.sectionIdentifier);
      await coll.deleteMany({});
      const docs = Array.isArray(finalJsonData) ? normaliseArray(finalJsonData) : normaliseArray([finalJsonData]);
      if (docs.length) await coll.insertMany(docs);
    }
  } catch (err: any) {
    console.error("Error writing to MongoDB:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Database error", error: err.message }) };
  }

  const msg =
    payload.sectionIdentifier === "profile"
      ? "Successfully processed Profile CSV and stored documents."
      : `Successfully processed CSV for section '${payload.sectionIdentifier}' and stored to MongoDB.`;
  return { statusCode: 200, body: JSON.stringify({ message: msg }) };
};

export { handler };
