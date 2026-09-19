// src/lib/admin/rp.ts
export interface RelyingParty { rpID: string; rpName: string; origins: string[]; secureCookies: boolean }

const PRODUCTION: RelyingParty = { rpID: "nhatminh.dev", rpName: "nhatminh.dev admin", origins: ["https://nhatminh.dev"], secureCookies: true };
// 3001 is the launch config, 3000 plain `npm run dev`, 8888 `netlify dev`.
const LOCAL: RelyingParty = { rpID: "localhost", rpName: "nhatminh.dev admin (local)", origins: ["http://localhost:3001", "http://localhost:3000", "http://localhost:8888"], secureCookies: false };

// Never from the Host header: the site also answers on *.netlify.app, and an rpId taken from there
// would be a fresh, unlocked enrolment door.
// The default MUST stay the literal expression `process.env.NODE_ENV`: Next replaces it when the bundle
// is built ("development" under `next dev`, "production" under every `next build`), so a NODE_ENV set on
// Netlify or in a shell cannot turn a production build into the localhost relying party. Reading it through
// a variable (`env.NODE_ENV`) is NOT replaced and follows the runtime — that was tried and it answered localhost.
export function relyingParty(nodeEnv: string | undefined = process.env.NODE_ENV): RelyingParty {
  return nodeEnv === "development" ? LOCAL : PRODUCTION;
}

/** The one WebAuthn account of this host. Constant, so enrolling again overwrites the provider's entry. No personal data. */
// Uint8Array.from: v14 wants Uint8Array<ArrayBuffer>; TextEncoder gives ArrayBufferLike, which TypeScript 5.8 refuses.
export const ownerUserId = (rp: RelyingParty) => Uint8Array.from(new TextEncoder().encode(`owner:${rp.rpID}`));
