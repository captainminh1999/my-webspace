// Shared plumbing for the scheduled feed functions. Each feed is a pure
// `fetch → trim → write` step with the same replace semantics as
// scripts/push-to-mongo.ts, plus the meta.fetchedAt stamp the dashboard reads.
import type { Db, Document } from "mongodb";
import { connectToDatabase } from "../../../src/lib/mongodb";

/** The switch. Until it is "true" on Netlify, every scheduled feed is a no-op and the GitHub Actions stay in charge. */
export const enabled = () => process.env.FEEDS_VIA_NETLIFY === "true";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** Scheduled functions get 30 s in total: 8 s to reach Mongo (src/lib/mongodb.ts), 8 s per upstream request (made in parallel within a feed). */
export async function getJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

/** Replaces a list. New documents go in before the old ones come out, so a page render never sees an empty list. */
export async function writeCollection(db: Db, name: string, docs: Document[]) {
  if (!docs.length) throw new Error(`nothing to write to ${name}; keeping the previous items`);
  const coll = db.collection(name);
  const { insertedIds } = await coll.insertMany(docs);
  await coll.deleteMany({ _id: { $nin: Object.values(insertedIds) } });
}

export async function writeSingleton(db: Db, id: string, doc: Document) {
  await db.collection<{ _id: string }>("singletons").replaceOne({ _id: id }, doc, { upsert: true });
}

export async function stamp(db: Db, key: string) {
  await db
    .collection<{ _id: string }>("singletons")
    .updateOne({ _id: "meta" }, { $set: { [`fetchedAt.${key}`]: new Date().toISOString() } }, { upsert: true });
}

/**
 * singletons/meta.lastRun.<key>: when the feed last ran here, whether it worked, and why not.
 * The function log is only visible inside Netlify; this makes a failing feed diagnosable from the data.
 * The message never carries a URL, because upstream URLs carry the API key.
 */
async function record(key: string, run: { ok: boolean; ms: number; error?: string }) {
  try {
    const client = await connectToDatabase();
    await client
      .db(process.env.MONGODB_DB || "cv")
      .collection<{ _id: string }>("singletons")
      .updateOne({ _id: "meta" }, { $set: { [`lastRun.${key}`]: { at: new Date().toISOString(), by: "netlify", ...run } } }, { upsert: true });
  } catch (err) {
    console.error(`feed ${key}: could not record the run`, err);
  }
}

const safeMessage = (err: unknown) =>
  (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).replace(/https?:\/\/\S+/g, "[url]").slice(0, 200);

/** Runs one feed: skips when disabled, logs, never throws (a failed feed leaves the previous data in place). */
export async function runFeed(key: string, fn: (db: Db) => Promise<void>): Promise<Response> {
  if (!enabled()) {
    console.log(`feed ${key}: skipped (FEEDS_VIA_NETLIFY is not "true")`);
    return new Response("skipped", { status: 200 });
  }
  const started = Date.now();
  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    await fn(db);
    await stamp(db, key);
    console.log(`feed ${key}: ok in ${Date.now() - started}ms`);
    await record(key, { ok: true, ms: Date.now() - started });
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(`feed ${key}: failed`, err);
    await record(key, { ok: false, ms: Date.now() - started, error: safeMessage(err) });
    return new Response("failed", { status: 500 });
  }
}
