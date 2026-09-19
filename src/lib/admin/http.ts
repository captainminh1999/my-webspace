import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { RelyingParty } from "./rp.ts";

const FIXED = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
export const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  Response.json(body, { status, headers: { ...FIXED, ...headers } });

export const MIN_SECRET = 16;
export const ENROLMENT_DISABLED = "Enrolment is disabled: UPLOAD_SECRET_KEY on this deployment is unset or shorter than 16 characters.";
export const secretUsable = (secret: string | undefined): secret is string => !!secret && secret.length >= MIN_SECRET;
// Hash both sides first: equal lengths for timingSafeEqual without a length check that would leak the length.
export function sameSecret(given: string, expected: string): boolean {
  const h = (s: string) => createHash("sha256").update(s, "utf8").digest();
  return timingSafeEqual(h(given), h(expected));
}

export const newToken = (): string => randomBytes(32).toString("base64url");           // 43 characters
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export const sessionCookieName = (rp: RelyingParty): string => (rp.secureCookies ? "__Host-admin_session" : "admin_session");
export const SESSION_SECONDS = 12 * 60 * 60;
export function sessionCookie(rp: RelyingParty, token: string, maxAge: number): string {
  return `${sessionCookieName(rp)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${rp.secureCookies ? "; Secure" : ""}`;
}
export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/** Steps 1–3 of the guard: headers only, nothing is read yet. */
export function checkHeaders(req: Request, rp: RelyingParty): Response | null {
  const origin = req.headers.get("origin");
  if (!origin || !rp.origins.includes(origin)) return json(403, { message: "Forbidden." });
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json(403, { message: "Forbidden." });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { message: "Unsupported media type." });
  return null;
}
/** Steps 4–5. */
export async function readJson(req: Request, limit: number): Promise<Record<string, unknown> | Response> {
  const tooLarge = () => json(413, { message: "Payload too large." });
  if (Number(req.headers.get("content-length") ?? "0") > limit) return tooLarge();
  // Counted WHILE reading, not after: a chunked body declares no length, and req.text() would take all of it in
  // first — 6 MB on Netlify, and whatever a LAN neighbour cares to stream at `next dev`, which has no cap of its own.
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader(); // no body at all: nothing to read, and "" is not JSON → 400
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); return tooLarge(); }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks)); // UTF-8, a leading BOM dropped: what req.text() did
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { /* falls through */ }
  return json(400, { message: "Bad request." });
}

/** The owner's words for a passkey: trimmed, no control characters, at most 60 characters (by code point). */
export function cleanLabel(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  // By code point, so nothing here depends on escape sequences surviving an editor: C0 and C1 controls go, the rest stays.
  const kept = Array.from(input).filter((ch) => { const c = ch.codePointAt(0) ?? 0; return c > 0x1f && (c < 0x7f || c > 0x9f); });
  const s = Array.from(kept.join("").trim()).slice(0, 60).join("").trim();
  return s || fallback;
}
