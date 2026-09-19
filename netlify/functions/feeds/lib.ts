// Shared plumbing for the scheduled feed functions. Each feed is a pure
// `fetch → trim → write` step that replaces the stored data, then writes the
// meta.fetchedAt stamp the dashboard reads and a meta.lastRun record.
import { refreshPages } from "./refresh";
import type { Db, Document } from "mongodb";
import { connectToDatabase } from "../../../src/lib/mongodb";
import { sizeFromBytes, type PixelSize } from "../../../src/utils/imageSize";

/** The switch. Unless it is "true" on Netlify, every scheduled feed is a no-op (the data simply stops updating and the stamps age). */
export const enabled = () => process.env.FEEDS_VIA_NETLIFY === "true";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** Scheduled functions get 30 s in total: 8 s to reach Mongo (src/lib/mongodb.ts), 8 s per upstream request (made in parallel within a feed). */
export async function getJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

/** Who is asking, for publishers' sites: their firewalls turn away Node's bare "node" (BeanScene answers 403), and an honest name is the polite one. */
export const READER = { "User-Agent": "Mozilla/5.0 (compatible; nhatminh.dev feed; +https://nhatminh.dev)" };

/** A feed or a page as text. `limit` is a timeout in ms, or a deadline shared with other requests. */
export async function getText(url: string, limit: number | AbortSignal = 8_000): Promise<string> {
  const res = await fetch(url, { headers: READER, signal: typeof limit === "number" ? AbortSignal.timeout(limit) : limit });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return res.text();
}

/**
 * Pixel size of a remote picture from its first bytes (256 KB at most, usually a few), or null. Never throws and
 * never fails a feed: without a size the dashboard frames the picture once it has loaded instead of before.
 */
export async function imageSize(url: string): Promise<PixelSize | null> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-262143" }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok || !res.body) return null;
    // A server may ignore Range and send the whole file; stop reading at the same limit.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let size: PixelSize | null = null;
    while (!size && total < 262_144) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      size = sizeFromBytes(Buffer.concat(chunks));
    }
    await reader.cancel().catch(() => {});
    return size;
  } catch {
    return null;
  }
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
 * singletons/meta.lastRun.<key>: when the feed last ran here, whether it worked, why not, whether the site took the refresh, and the feed's own note.
 * The function log is only visible inside Netlify; this makes a failing feed diagnosable from the data.
 * The message never carries a URL, because upstream URLs carry the API key.
 */
async function record(key: string, run: { ok: boolean; ms: number; error?: string; refresh?: string; note?: string }) {
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
export async function runFeed(key: string, fn: (db: Db) => Promise<void | string>): Promise<Response> {
  if (!enabled()) {
    console.log(`feed ${key}: skipped (FEEDS_VIA_NETLIFY is not "true")`);
    return new Response("skipped", { status: 200 });
  }
  const started = Date.now();
  try {
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const note = (await fn(db)) || undefined;
    await stamp(db, key);
    // New data is in: the cached home page is now out of date, so the next visitor should get a fresh render.
    const refresh = await refreshPages("home");
    console.log(`feed ${key}: ok in ${Date.now() - started}ms (page refresh: ${refresh})`);
    await record(key, { ok: true, ms: Date.now() - started, refresh, ...(note ? { note } : {}) });
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(`feed ${key}: failed`, err);
    await record(key, { ok: false, ms: Date.now() - started, error: safeMessage(err) });
    return new Response("failed", { status: 500 });
  }
}
