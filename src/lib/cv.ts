// Server-side CV data. Same policy as src/lib/dashboard.ts: read MongoDB
// directly when MONGODB_URI is set, otherwise assemble over HTTP from the
// deployed functions. Only the sections a page renders are read.
import type { Document } from "mongodb";
import { connectToDatabase } from "./mongodb";
import { baseUrl, decodeStrings } from "./dashboard";
import type { FullCvData } from "@/types";

export type CvSection = keyof FullCvData;

const SINGLETON: Partial<Record<CvSection, string>> = { profile: "profile", about: "about" };

/** Every section the public CV pages render (recommendationsGiven is not rendered anywhere). */
export const RENDERED_SECTIONS: CvSection[] = [
  "profile",
  "about",
  "experience",
  "education",
  "licenses",
  "projects",
  "volunteering",
  "skills",
  "recommendationsReceived",
  "honorsAwards",
  "languages",
];

export const EMPTY_CV: FullCvData = {
  profile: null,
  about: null,
  experience: [],
  education: [],
  licenses: [],
  projects: [],
  volunteering: [],
  skills: null,
  recommendationsGiven: [],
  recommendationsReceived: [],
  honorsAwards: [],
  languages: [],
};

async function readSection<S extends CvSection>(section: S): Promise<FullCvData[S]> {
  if (process.env.MONGODB_URI) {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const singleton = SINGLETON[section];
    if (singleton) {
      const doc = await db.collection("singletons").findOne({ _id: singleton as unknown as never });
      if (!doc) return null as FullCvData[S];
      const { _id: _ignored, ...rest } = doc as Document;
      void _ignored;
      return rest as FullCvData[S];
    }
    const docs = await db.collection(section).find({}).toArray();
    return docs.map(({ _id: _ignored, ...rest }) => {
      void _ignored;
      return rest;
    }) as FullCvData[S];
  }
  const res = await fetch(`${baseUrl()}/.netlify/functions/get-cv-section?section=${encodeURIComponent(section)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`get-cv-section ${section}: ${res.status}`);
  return (await res.json()) as FullCvData[S];
}

/** One section; never throws — a missing or failing section renders as empty. */
export async function getCvSection<S extends CvSection>(section: S): Promise<FullCvData[S]> {
  try {
    const value = await readSection(section);
    return decodeStrings(value ?? EMPTY_CV[section]) as FullCvData[S];
  } catch (err) {
    console.error(`CV section ${section} unavailable`, err);
    return EMPTY_CV[section];
  }
}

/** Everything the /about-me page renders, read in parallel. */
export async function getFullCv(): Promise<FullCvData> {
  const values = await Promise.all(RENDERED_SECTIONS.map((s) => getCvSection(s)));
  const out: FullCvData = { ...EMPTY_CV };
  RENDERED_SECTIONS.forEach((s, i) => {
    (out as unknown as Record<string, unknown>)[s] = values[i];
  });
  return out;
}
