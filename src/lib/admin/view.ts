// src/lib/admin/view.ts — what /admin/upload shows, decided on the server. No Next imports here: deps.ts
// hands in the cookie and the Host header, so the tests can ask the same question with an in-memory store.
import type { RelyingParty } from "./rp.ts";
import type { CredentialDoc } from "./store.ts";
import { secretUsable } from "./http.ts";
import { sessionFromToken, type AdminDeps } from "./handlers.ts";

export interface PasskeySummary { label: string; createdAt: string; lastUsedAt: string | null; synced: boolean }
export type AdminView =
  | { state: "unavailable" | "signin" | "enrol" | "enrol-disabled"; hostHint: string | null }
  | { state: "upload"; hostHint: string | null; passkeys: PasskeySummary[] }; // no ids, no keys

/** What the browser may know of a passkey. Field by field on purpose: a spread would send the id and the public key along. */
export const summary = (c: CredentialDoc): PasskeySummary => ({
  label: c.label,
  createdAt: c.createdAt.toISOString(),
  lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
  synced: c.backedUp,
});

/**
 * A line for someone who opened the admin on a host where passkeys cannot work (a *.netlify.app alias, a deploy
 * preview, 127.0.0.1). The Host header is read for this sentence ONLY — no decision is ever taken from it.
 */
export function hostHint(rp: RelyingParty, host: string | null): string | null {
  if (!host || rp.origins.some((o) => new URL(o).host === host.toLowerCase())) return null;
  if (rp.secureCookies) return `Admin works only on ${rp.origins[0]}`;
  // Locally the usual slip is 127.0.0.1 for localhost: keep the port the owner is on when it is one of ours.
  const port = /:(\d+)$/.exec(host)?.[1];
  return `Open ${rp.origins.find((o) => new URL(o).port === port) ?? rp.origins[0]}`;
}

export async function viewFor(deps: AdminDeps, token: string | undefined, hint: string | null): Promise<AdminView> {
  try {
    if (await sessionFromToken(token, deps)) return { state: "upload", hostHint: hint, passkeys: (await deps.store.listCredentials(deps.rp.rpID)).map(summary) };
    if ((await deps.store.countCredentials(deps.rp.rpID)) > 0) return { state: "signin", hostHint: hint };
    return { state: secretUsable(deps.enrolmentSecret) ? "enrol" : "enrol-disabled", hostHint: hint };
  } catch (err) {
    // Fail closed: with Mongo down the page offers nothing, least of all enrolment.
    console.error("admin page", err);
    return { state: "unavailable", hostHint: hint };
  }
}
