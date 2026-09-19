// src/lib/admin/cvUpload.ts — what a CV upload does to the database, in two halves.
//
// planUpload() is the shaping that used to live in the Netlify upload function (deleted with this move;
// `git log --diff-filter=D -- netlify/functions` finds it), moved as it was: CSV in, the list of Mongo operations
// out. It touches nothing, so the move can be proven write for write against goldens captured from the old
// function (__tests__/fixtures/*.writes.json). applyWrites() is the only part that talks to Mongo, and it does
// nothing but replay the list.
import Papa from "papaparse";
import type { Db } from "mongodb";
import { isCvSection, isSingletonSection } from "./sections.ts";

export type CvWrite =
  | { coll: string; op: "updateOne"; filter: { _id: string }; update: { $set: Record<string, unknown> }; options: { upsert: true } }
  | { coll: string; op: "replaceOne"; filter: { _id: string }; doc: Record<string, unknown>; options: { upsert: true } }
  | { coll: string; op: "deleteMany"; filter: Record<string, never> }
  | { coll: string; op: "insertMany"; docs: Record<string, unknown>[] };
export type UploadPlan = { ok: true; writes: CvWrite[]; message: string } | { ok: false; status: 400 | 500; message: string };

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toCamelCase = (str: string): string => {
  if (!str) return "";
  const s = str
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  return s.charAt(0).toLowerCase() + s.slice(1);
};

const transformCause = (rawCause?: string | null): string | null => {
  if (!rawCause) return null;
  const causeMap: Record<string, string> = {
    economicempowerment: "Economic Empowerment",
    scienceandtechnology: "Science and Technology",
  };
  const key = rawCause.toLowerCase().replace(/[^a-z0-9]/g, "");
  return causeMap[key] || rawCause.replace(/([A-Z0-9])/g, " $1").replace(/^./, (char) => char.toUpperCase()).trim();
};

// Papa's dynamicTyping turns "2000" into a number; the site reads every CV value as text.
const convertPrimitivesToStrings = (data: unknown): unknown => {
  if (Array.isArray(data)) return data.map((item) => convertPrimitivesToStrings(item));
  if (typeof data === "object" && data !== null) {
    const out: Record<string, unknown> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = convertPrimitivesToStrings((data as Record<string, unknown>)[key]);
    }
    return out;
  }
  return data !== null && typeof data !== "undefined" ? String(data) : data;
};

// A list section holds documents; a bare string (a skill) becomes { value }.
const normaliseArray = (arr: unknown[]): Record<string, unknown>[] =>
  arr.map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : { value: item }));

// Empty cells become null, except in these: the pages print them and expect text.
const REQUIRED_STRING_FIELDS = [
  "firstName", "lastName", "headline", "title", "name", "authority", "schoolName", "startDate", "endDate", "text",
  "creationDate", "issuedOn", "proficiency", "description", "role", "companyName",
];

const splitList = (value: string): string[] => value.split(/[,;]/).map((s) => s.trim()).filter(Boolean);

function experienceByCompany(rows: Row[]): Row[] {
  const companies: Record<string, Row> = {};
  rows.forEach((row) => {
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
    let responsibilities: string[] = [];
    if (row.responsibilities) {
      responsibilities = typeof row.responsibilities === "string" ? splitList(row.responsibilities) : Array.isArray(row.responsibilities) ? row.responsibilities.map(String) : [];
    } else {
      responsibilities = Object.keys(row).filter((key) => key.startsWith("responsibility") && row[key]).map((key) => String(row[key]));
    }

    let skills: string[] = [];
    if (row.skills && typeof row.skills === "string") skills = splitList(row.skills);
    else if (Array.isArray(row.skills)) skills = row.skills.map(String);

    companies[companyName].roles.push({
      title: row.roleTitle || row.title,
      startDate: row.roleStartDate || row.startDate,
      // Left as the old function had it: with no "End Date" column an open role carries `undefined`, which the driver stores as null.
      endDate: row.roleEndDate || row.endDate,
      duration: row.roleDuration || row.duration || null,
      responsibilities,
      skills,
      location: row.roleLocation || null,
    });
  });
  return Object.values(companies);
}

/** Pure: CSV in, the Mongo operations out. No I/O, so the move from the Netlify function is provable write for write. */
export function planUpload(sectionIdentifier: string, fileContentBase64: string): UploadPlan {
  if (!isCvSection(sectionIdentifier)) return { ok: false, status: 400, message: "Bad Request: Invalid section identifier." };

  let rows: Row[];
  try {
    const csv = Buffer.from(fileContentBase64, "base64").toString("utf-8");
    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => toCamelCase(header),
      transform: (value, header) => (value === "" && !REQUIRED_STRING_FIELDS.includes(toCamelCase(String(header))) ? null : value),
    });
    rows = convertPrimitivesToStrings(parsed.data) as Row[];
  } catch (err) {
    console.error("admin upload: CSV could not be parsed", err);
    return { ok: false, status: 400, message: "Bad Request: Could not parse CSV." };
  }

  try {
    if (sectionIdentifier === "profile") {
      if (rows.length === 0) return { ok: false, status: 400, message: "Profile CSV is empty or invalid." };
      const profile = { ...rows[0] };
      // The summary stays on the profile too: the dashboard's Profile card reads it from there. Dropping it
      // here left the card showing the summary of an upload long past.
      const summaryForAbout = profile.summary || "";
      if (profile.websites && typeof profile.websites === "string") profile.websites = splitList(profile.websites);
      else if (!profile.websites) profile.websites = [];
      return {
        ok: true,
        message: "Successfully processed Profile CSV and stored documents.",
        writes: [
          { coll: "singletons", op: "updateOne", filter: { _id: "profile" }, update: { $set: profile }, options: { upsert: true } },
          // Replaced, not merged: an About written for the last job (its own list of achievements and notes) must not stay under a new summary.
          { coll: "singletons", op: "replaceOne", filter: { _id: "about" }, doc: { content: String(summaryForAbout) }, options: { upsert: true } },
        ],
      };
    }

    const message = `Successfully processed CSV for section '${sectionIdentifier}' and stored to MongoDB.`;
    if (isSingletonSection(sectionIdentifier)) {
      // As before: exactly one row is the document. Any other number of rows goes through as the array it is,
      // Mongo refuses a $set of an array, and the upload ends in "Database error" with nothing written.
      const doc = (rows.length === 1 ? rows[0] : rows) as Record<string, unknown>;
      return { ok: true, message, writes: [{ coll: "singletons", op: "updateOne", filter: { _id: sectionIdentifier }, update: { $set: doc }, options: { upsert: true } }] };
    }

    let list: unknown[] = rows;
    if (sectionIdentifier === "skills") list = rows.map((row) => String(row.skillName || Object.values(row)[0] || "")).filter(Boolean);
    else if (sectionIdentifier === "volunteering") list = rows.map((item) => ({ ...item, cause: transformCause(item.cause) }));
    else if (sectionIdentifier === "experience") list = experienceByCompany(rows);

    const docs = normaliseArray(list);
    const writes: CvWrite[] = [{ coll: sectionIdentifier, op: "deleteMany", filter: {} }];
    if (docs.length) writes.push({ coll: sectionIdentifier, op: "insertMany", docs });
    return { ok: true, message, writes };
  } catch (err) {
    // The reason goes to the log; the response no longer carries err.message.
    console.error(`admin upload: error processing section ${sectionIdentifier}`, err);
    return { ok: false, status: 500, message: "Error processing CSV." };
  }
}

/** The executor: replays a plan, in order, on one database. Nothing is decided here. */
export async function applyWrites(db: Db, writes: CvWrite[]): Promise<void> {
  for (const w of writes) {
    switch (w.op) {
      case "updateOne": await db.collection<{ _id: string }>(w.coll).updateOne(w.filter, w.update, w.options); break;
      case "replaceOne": await db.collection<{ _id: string }>(w.coll).replaceOne(w.filter, w.doc, w.options); break;
      case "deleteMany": await db.collection(w.coll).deleteMany(w.filter); break;
      case "insertMany": await db.collection(w.coll).insertMany(w.docs); break;
    }
  }
}
