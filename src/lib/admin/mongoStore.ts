// src/lib/admin/mongoStore.ts — AdminStore on three collections of the site's database: admin_credentials,
// admin_sessions, admin_challenges. They carry the repo's first indexes, created lazily from here.
import { MongoServerError, type Db } from "mongodb";
import { connectToDatabase } from "../mongodb.ts";
import type { AdminStore, ChallengeDoc, CredentialDoc, SessionDoc } from "./store.ts";

// Ids come out of requests, and in a filter Mongo reads anything that is not a string as an operator expression:
// { _id: { $gt: "" } } matches every document. The handlers already refuse such values; this is the second lock,
// so a value that is not a string never reaches the driver — it finds nothing and changes nothing.
const isId = (value: unknown): value is string => typeof value === "string";

const siteDatabase = async (): Promise<Db> => (await connectToDatabase()).db(process.env.MONGODB_DB || "cv");

/** `connect` is a parameter for the tests only (a fake Db); the site uses `mongoStore` below. */
export function createMongoStore(connect: () => Promise<Db> = siteDatabase): AdminStore {
  // One attempt per warm process; a failure clears the memo (same reason as src/lib/mongodb.ts) — otherwise
  // one transient error would disable the admin for the life of the process. createIndex on an index that
  // already exists with the same options is a no-op, so every cold start may ask again.
  let indexes: Promise<void> | null = null;
  function ensureIndexes(db: Db): Promise<void> {
    indexes ??= Promise.all([
      // Correctness, not housekeeping: two holders of the secret cannot both enrol the first passkey.
      db.collection("admin_credentials").createIndex({ rpId: 1, bootstrap: 1 }, { unique: true, partialFilterExpression: { bootstrap: true }, name: "one_bootstrap_per_rp" }),
      // Housekeeping only — the TTL monitor runs about once a minute, so the code always compares expiresAt with now itself.
      db.collection("admin_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("admin_challenges").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((err) => { indexes = null; throw err; });
    return indexes;
  }
  async function database(forWrite: boolean): Promise<Db> {
    const db = await connect();
    if (forWrite) await ensureIndexes(db);
    return db;
  }
  const credentials = async (forWrite: boolean) => (await database(forWrite)).collection<CredentialDoc>("admin_credentials");
  const sessions = async (forWrite: boolean) => (await database(forWrite)).collection<SessionDoc>("admin_sessions");
  const challenges = async (forWrite: boolean) => (await database(forWrite)).collection<ChallengeDoc>("admin_challenges");

  return {
    async countCredentials(rpId) { return (await credentials(false)).countDocuments({ rpId }); },
    async listCredentials(rpId) { return (await credentials(false)).find({ rpId }).sort({ createdAt: 1 }).toArray(); },
    async findCredential(rpId, id) { return isId(id) ? (await credentials(false)).findOne({ _id: id, rpId }) : null; },
    async insertCredential(doc) {
      try { await (await credentials(true)).insertOne(doc); return "ok"; }
      catch (err) {
        if (!(err instanceof MongoServerError) || err.code !== 11000) throw err;
        // keyPattern names the index that refused the insert ({ _id: 1 } or { rpId: 1, bootstrap: 1 }); the message names it too.
        const pattern = (err.keyPattern ?? {}) as Record<string, unknown>;
        return "bootstrap" in pattern || err.message.includes("one_bootstrap_per_rp") ? "locked" : "duplicate";
      }
    },
    async recordUse(rpId, id, use) { if (isId(id)) await (await credentials(true)).updateOne({ _id: id, rpId }, { $set: use }); },
    // `limit` bounds the work whatever an attacker has piled up.
    async countLoginChallenges(rpId, now, stopAt) { return (await challenges(false)).countDocuments({ rpId, kind: "authentication", expiresAt: { $gt: now } }, { limit: stopAt }); },
    async saveChallenge(doc) { await (await challenges(true)).insertOne(doc); },
    // findOneAndDelete: two requests with the same challenge cannot both get it.
    async takeChallenge(rpId, kind, challenge) { return isId(challenge) ? (await challenges(true)).findOneAndDelete({ _id: challenge, kind, rpId }) : null; },
    async saveSession(doc) { await (await sessions(true)).insertOne(doc); },
    async findSession(idHash) { return isId(idHash) ? (await sessions(false)).findOne({ _id: idHash }) : null; },
    async deleteSession(idHash) { if (isId(idHash)) await (await sessions(true)).deleteOne({ _id: idHash }); },
  };
}

export const mongoStore: AdminStore = createMongoStore();
