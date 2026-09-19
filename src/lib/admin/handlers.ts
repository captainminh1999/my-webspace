// src/lib/admin/handlers.ts — the six POST endpoints under /api/admin/*, without Next: a Request and the
// dependencies in, a Response out. The route files are three lines each, and the tests drive these same
// functions with an in-memory store, a software passkey and their own clock.
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { ownerUserId, type RelyingParty } from "./rp.ts";
import type { AdminStore, ChallengeDoc, SessionDoc } from "./store.ts";
import { checkHeaders, cleanLabel, ENROLMENT_DISABLED, hashToken, json, newToken, readCookie, readJson, sameSecret, secretUsable, SESSION_SECONDS, sessionCookie, sessionCookieName } from "./http.ts";
import { planUpload, type CvWrite } from "./cvUpload.ts";
import { isCvSection } from "./sections.ts";

export interface AdminDeps {
  store: AdminStore; rp: RelyingParty; now(): Date; enrolmentSecret: string | undefined;
  cv: { apply(writes: CvWrite[]): Promise<void>; revalidate(section: string): void };
}

// ES256, RS256. Named on BOTH registration calls: the library's own default adds EdDSA, and ML-DSA-44 where the runtime has it.
const ALGS = [-7, -257];
const CHALLENGE_MS = 5 * 60_000;
export const MAX_LOGIN_CHALLENGES = 5_000;   // ≈1 MB of ~200-byte documents; registration challenges are never capped —
                                             // the secret or a session already gates them, and a cap there would lock recovery out
const AUTH_LIMIT = 64 * 1024, UPLOAD_LIMIT = 2 * 1024 * 1024;
// A session adds a passkey only while it is this young. A passkey outlives logout, the 12 hours and an emptied
// admin_sessions, so without this a copied cookie could turn its 12 hours into access for good.
const ADD_PASSKEY_MS = 5 * 60_000;

// JSON decides the type of everything in a body, not the caller: a value that is not a string is never
// coerced (String() throws on { toString: 1 }, and String(["x"]) is "x") — it simply is not there.
const text = (value: unknown): string => (typeof value === "string" ? value : "");

const unavailable = (where: string, err: unknown): Response => {
  console.error(`admin ${where}`, err);
  return json(503, { message: "Admin is unavailable." });
};

/** A session is only as alive as the passkey that opened it: deleting the credential in Atlas ends it. */
export async function sessionFromToken(token: string | undefined, deps: AdminDeps): Promise<SessionDoc | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await deps.store.findSession(hashToken(token));
  if (!session || session.rpId !== deps.rp.rpID || session.expiresAt <= deps.now()) return null;
  return (await deps.store.findCredential(deps.rp.rpID, session.credentialId)) ? session : null;
}
const sessionFromRequest = (req: Request, deps: AdminDeps) => sessionFromToken(readCookie(req.headers.get("cookie"), sessionCookieName(deps.rp)), deps);

async function openSession(deps: AdminDeps, credentialId: string): Promise<string> {
  const token = newToken(), now = deps.now();
  await deps.store.saveSession({ _id: hashToken(token), rpId: deps.rp.rpID, credentialId, createdAt: now, expiresAt: new Date(+now + SESSION_SECONDS * 1000) });
  return sessionCookie(deps.rp, token, SESSION_SECONDS);
}

/** The guard every endpoint but the upload shares: headers, then the body, then the work; anything thrown is a 503 with the detail in the log only. */
async function guarded(req: Request, deps: AdminDeps, where: string, fn: (body: Record<string, unknown>) => Promise<Response>): Promise<Response> {
  const refused = checkHeaders(req, deps.rp);
  if (refused) return refused;
  try {
    const body = await readJson(req, AUTH_LIMIT);
    return body instanceof Response ? body : await fn(body);
  } catch (err) { return unavailable(where, err); }
}

export const registerOptions = (req: Request, deps: AdminDeps): Promise<Response> => guarded(req, deps, "register/options", async (body) => {
  const { store, rp } = deps, now = deps.now();
  const existing = await store.listCredentials(rp.rpID);
  let authorisedBy: "secret" | "session";
  if (existing.length === 0) {
    if (!secretUsable(deps.enrolmentSecret)) return json(503, { message: ENROLMENT_DISABLED });
    if (!sameSecret(text(body.secret), deps.enrolmentSecret)) return json(403, { message: "Forbidden." });
    authorisedBy = "secret";
  } else {
    // Locked: the secret is not even compared, so this endpoint is no oracle for it.
    const session = await sessionFromRequest(req, deps);
    if (!session) return json(403, { message: "Registration is closed." });
    if (+now - +session.createdAt > ADD_PASSKEY_MS) return json(403, { message: "A passkey can only be added within 5 minutes of signing in. Sign out, sign in again, then add it." });
    authorisedBy = "session";
  }
  const options = await generateRegistrationOptions({
    rpName: rp.rpName, rpID: rp.rpID,
    userName: "owner", userDisplayName: "Site owner", userID: ownerUserId(rp),
    timeout: 120_000, attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c._id, transports: c.transports })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    supportedAlgorithmIDs: ALGS,
  });
  // The library makes the challenge; it is looked up by value at verification, so no challenge cookie exists.
  await store.saveChallenge({ _id: options.challenge, kind: "registration", rpId: rp.rpID, authorisedBy, createdAt: now, expiresAt: new Date(+now + CHALLENGE_MS) });
  return json(200, options);
});

// The library passes response.response.transports through unread — any JSON. It is stored and later sent back
// in excludeCredentials, so only a handful of strings is kept.
const transportsOf = (given: unknown): string[] => (Array.isArray(given) ? given.filter((t): t is string => typeof t === "string").slice(0, 8) : []);

export const registerVerify = (req: Request, deps: AdminDeps): Promise<Response> => guarded(req, deps, "register/verify", async (body) => {
  const { store, rp } = deps, now = deps.now();
  const failed = () => json(400, { message: "Passkey could not be registered." });
  // An object, not a `let`: TypeScript narrows a `let` that is only assigned inside a closure to `never`.
  const taken: { doc: ChallengeDoc | null } = { doc: null };
  let result;
  try {
    result = await verifyRegistrationResponse({
      response: body.response as RegistrationResponseJSON,
      // The library hands over whatever JSON the client put in clientDataJSON.challenge, and nothing signs it at
      // enrolment. In a Mongo filter { "$gt": "" } matches ANY live challenge — the owner's, authorised by the
      // secret, while the owner looks at Touch ID. Only a string ever reaches the store.
      // findOneAndDelete: the challenge is spent whatever happens next, a failed verification included.
      expectedChallenge: async (c: unknown) => { if (typeof c !== "string") return false; taken.doc = await store.takeChallenge(rp.rpID, "registration", c); return !!taken.doc && taken.doc.expiresAt > now; },
      expectedOrigin: rp.origins, expectedRPID: rp.rpID, requireUserVerification: true, supportedAlgorithmIDs: ALGS,
    });
  } catch (err) {
    // The library throws for challenge, origin, rpId, user verification; `verified: false` is only a bad signature. Same answer for all.
    console.error("admin register/verify refused:", err instanceof Error ? err.message : err);
    return failed();
  }
  if (!result.verified || !result.registrationInfo || !taken.doc) return failed();

  const bootstrap = taken.doc.authorisedBy === "secret";
  if (!bootstrap && !(await sessionFromRequest(req, deps))) return json(403, { message: "Registration is closed." });
  const { credential, credentialDeviceType, credentialBackedUp, aaguid } = result.registrationInfo;
  const outcome = await store.insertCredential({
    _id: credential.id, rpId: rp.rpID, publicKey: isoBase64URL.fromBuffer(credential.publicKey), counter: credential.counter,
    transports: transportsOf(credential.transports), deviceType: credentialDeviceType, backedUp: credentialBackedUp, aaguid,
    label: cleanLabel(body.label, credentialBackedUp ? "Synced passkey" : "Device passkey"),
    ...(bootstrap ? { bootstrap: true as const } : {}), createdAt: now, lastUsedAt: null,
  });
  if (outcome === "locked") return json(403, { message: "Registration is closed." });
  if (outcome === "duplicate") return json(409, { message: "This passkey is already registered." });
  // The first passkey signs the owner in; one added later belongs to a browser that already is.
  return json(200, { verified: true }, bootstrap ? { "set-cookie": await openSession(deps, credential.id) } : {});
});

export const loginOptions = (req: Request, deps: AdminDeps): Promise<Response> => guarded(req, deps, "login/options", async () => {
  const { store, rp } = deps, now = deps.now();
  if ((await store.countLoginChallenges(rp.rpID, now, MAX_LOGIN_CHALLENGES + 1)) > MAX_LOGIN_CHALLENGES) return json(429, { message: "Too many sign-in attempts in progress. Try again in a few minutes." });
  // The same answer whether or not a passkey exists: an empty allowCredentials tells a stranger nothing.
  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required", allowCredentials: [], timeout: 120_000 });
  await store.saveChallenge({ _id: options.challenge, kind: "authentication", rpId: rp.rpID, createdAt: now, expiresAt: new Date(+now + CHALLENGE_MS) });
  return json(200, options);
});

export const loginVerify = (req: Request, deps: AdminDeps): Promise<Response> => guarded(req, deps, "login/verify", async (body) => {
  const { store, rp } = deps, now = deps.now();
  const failed = () => json(401, { message: "Sign-in failed." });
  const response = body.response as AuthenticationResponseJSON | undefined;
  // Per rpId: a localhost passkey does not exist here.
  const doc = response && typeof response.id === "string" ? await store.findCredential(rp.rpID, response.id) : null;
  if (!response || !doc) return failed();
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response, expectedOrigin: rp.origins, expectedRPID: rp.rpID, requireUserVerification: true,
      // A string or nothing, as at enrolment: an operator expression must not pick a challenge.
      expectedChallenge: async (c: unknown) => { if (typeof c !== "string") return false; const ch = await store.takeChallenge(rp.rpID, "authentication", c); return !!ch && ch.expiresAt > now; },
      credential: { id: doc._id, publicKey: isoBase64URL.toBuffer(doc.publicKey), counter: doc.counter, transports: doc.transports },
    });
  } catch (err) {
    // One answer for every cause; the library's reason is for the log.
    console.error("admin login/verify refused:", err instanceof Error ? err.message : err);
    return failed();
  }
  if (!result.verified) return failed();
  await store.recordUse(rp.rpID, doc._id, { counter: result.authenticationInfo.newCounter, backedUp: result.authenticationInfo.credentialBackedUp, lastUsedAt: now });
  return json(200, { verified: true }, { "set-cookie": await openSession(deps, doc._id) });
});

export const logout = (req: Request, deps: AdminDeps): Promise<Response> => guarded(req, deps, "logout", async () => {
  // Deleted on the server, not only in the browser: a copied cookie is dead too. Idempotent.
  const token = readCookie(req.headers.get("cookie"), sessionCookieName(deps.rp));
  if (token) await deps.store.deleteSession(hashToken(token));
  return json(200, { signedOut: true }, { "set-cookie": sessionCookie(deps.rp, "", 0) });
});

export async function upload(req: Request, deps: AdminDeps): Promise<Response> {
  const refused = checkHeaders(req, deps.rp);
  if (refused) return refused;
  try {
    // From headers only, before the body is read: nobody unauthenticated makes the server take in 2 MB.
    if (!(await sessionFromRequest(req, deps))) return json(401, { message: "Not signed in." });
    const body = await readJson(req, UPLOAD_LIMIT);
    if (body instanceof Response) return body;
    const section = text(body.sectionIdentifier);
    // The old function refused a missing file. Read as "" it would be an empty CSV — and an empty CSV empties the section.
    if (isCvSection(section) && typeof body.fileContentBase64 !== "string") return json(400, { message: "Bad Request: Invalid file content encoding." });
    const plan = planUpload(section, text(body.fileContentBase64));
    if (!plan.ok) return json(plan.status, { message: plan.message });
    try { await deps.cv.apply(plan.writes); } catch (err) { console.error("admin upload: MongoDB write failed", err); return json(500, { message: "Database error" }); }
    deps.cv.revalidate(section);
    return json(200, { message: plan.message });
  } catch (err) { return unavailable("upload", err); }
}
