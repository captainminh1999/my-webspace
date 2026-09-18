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

export async function getJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

export async function writeCollection(db: Db, name: string, docs: Document[]) {
  const coll = db.collection(name);
  await coll.deleteMany({});
  if (docs.length) await coll.insertMany(docs);
}

export async function writeSingleton(db: Db, id: string, doc: Document) {
  const singletons = db.collection<{ _id: string }>("singletons");
  await singletons.deleteOne({ _id: id });
  await singletons.insertOne({ _id: id, ...doc });
}

export async function stamp(db: Db, key: string) {
  await db
    .collection<{ _id: string }>("singletons")
    .updateOne({ _id: "meta" }, { $set: { [`fetchedAt.${key}`]: new Date().toISOString() } }, { upsert: true });
}

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
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(`feed ${key}: failed`, err);
    return new Response("failed", { status: 500 });
  }
}
