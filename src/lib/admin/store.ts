// src/lib/admin/store.ts — no imports; mongoStore.ts and the tests' memoryStore.ts both implement it
export interface CredentialDoc {
  _id: string;                       // credential id, base64url
  rpId: string;
  publicKey: string;                 // COSE key, base64url
  counter: number;                   // stays 0 for synced passkeys
  transports: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  aaguid: string;
  label: string;                     // ≤ 60 characters, no control characters
  bootstrap?: true;                  // only on the passkey enrolled with the secret
  createdAt: Date;
  lastUsedAt: Date | null;
}
export interface SessionDoc { _id: string /* sha256 hex of the cookie token */; rpId: string; credentialId: string; createdAt: Date; expiresAt: Date }
export interface ChallengeDoc { _id: string /* the challenge, not a secret */; kind: "registration" | "authentication"; rpId: string; authorisedBy?: "secret" | "session"; createdAt: Date; expiresAt: Date }

export interface AdminStore {
  countCredentials(rpId: string): Promise<number>;
  listCredentials(rpId: string): Promise<CredentialDoc[]>;
  findCredential(rpId: string, id: string): Promise<CredentialDoc | null>;
  insertCredential(doc: CredentialDoc): Promise<"ok" | "duplicate" | "locked">;
  recordUse(rpId: string, id: string, use: { counter: number; backedUp: boolean; lastUsedAt: Date }): Promise<void>;
  /** Live sign-in challenges of ONE rpId. Expired documents the TTL monitor has not reaped yet do not count. */
  countLoginChallenges(rpId: string, now: Date, stopAt: number): Promise<number>;
  saveChallenge(doc: ChallengeDoc): Promise<void>;
  takeChallenge(rpId: string, kind: ChallengeDoc["kind"], challenge: string): Promise<ChallengeDoc | null>; // findOneAndDelete — atomic single use
  saveSession(doc: SessionDoc): Promise<void>;
  findSession(idHash: string): Promise<SessionDoc | null>;
  deleteSession(idHash: string): Promise<void>;
}
