// AdminStore on three Maps, with the three guarantees the handlers lean on in Mongo: _id is unique, one
// bootstrap passkey per rpId (the partial unique index), and a challenge can be taken exactly once.
// The Maps are public: a test "deletes the document in Atlas" by deleting from them.
import type { AdminStore, ChallengeDoc, CredentialDoc, SessionDoc } from '../store.ts';

// Mongo reads an _id that is not a string as an operator expression, and { $gt: "" } matches every document.
// Map.get() would hide that — an object is never a key — and it did hide it once. So this store takes the worst
// case: an id that is not a string matches the FIRST document that fits the rest of the filter. A handler that
// lets such a value through then signs a stranger in under test, instead of looking safe.
function lookup<T>(map: Map<string, T>, id: unknown, fits: (doc: T) => boolean = () => true): [string, T] | null {
  if (typeof id === 'string') {
    const doc = map.get(id);
    return doc && fits(doc) ? [id, doc] : null;
  }
  for (const [key, doc] of map) if (fits(doc)) return [key, doc];
  return null;
}

export class MemoryStore implements AdminStore {
  credentials = new Map<string, CredentialDoc>();
  challenges = new Map<string, ChallengeDoc>();
  sessions = new Map<string, SessionDoc>();

  async countCredentials(rpId: string) {
    return (await this.listCredentials(rpId)).length;
  }
  async listCredentials(rpId: string) {
    return [...this.credentials.values()].filter((c) => c.rpId === rpId);
  }
  async findCredential(rpId: string, id: string) {
    return lookup(this.credentials, id, (c) => c.rpId === rpId)?.[1] ?? null;
  }
  async insertCredential(doc: CredentialDoc) {
    if (this.credentials.has(doc._id)) return 'duplicate' as const;
    if (doc.bootstrap && [...this.credentials.values()].some((c) => c.rpId === doc.rpId && c.bootstrap)) return 'locked' as const;
    this.credentials.set(doc._id, doc);
    return 'ok' as const;
  }
  async recordUse(rpId: string, id: string, use: { counter: number; backedUp: boolean; lastUsedAt: Date }) {
    const c = await this.findCredential(rpId, id);
    if (c) Object.assign(c, use);
  }
  // The same filter as Mongo's countDocuments({ rpId, kind: "authentication", expiresAt: { $gt: now } }, { limit: stopAt }).
  async countLoginChallenges(rpId: string, now: Date, stopAt: number) {
    let n = 0;
    for (const c of this.challenges.values()) {
      if (c.rpId === rpId && c.kind === 'authentication' && c.expiresAt > now && ++n >= stopAt) break;
    }
    return n;
  }
  async saveChallenge(doc: ChallengeDoc) {
    this.challenges.set(doc._id, doc);
  }
  // findOneAndDelete({ _id, kind, rpId }): a document that does not match stays where it is.
  async takeChallenge(rpId: string, kind: ChallengeDoc['kind'], challenge: string) {
    const found = lookup(this.challenges, challenge, (c) => c.rpId === rpId && c.kind === kind);
    if (!found) return null;
    this.challenges.delete(found[0]);
    return found[1];
  }
  async saveSession(doc: SessionDoc) {
    this.sessions.set(doc._id, doc);
  }
  async findSession(idHash: string) {
    return lookup(this.sessions, idHash)?.[1] ?? null;
  }
  async deleteSession(idHash: string) {
    const found = lookup(this.sessions, idHash);
    if (found) this.sessions.delete(found[0]);
  }
}
