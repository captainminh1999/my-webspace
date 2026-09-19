// POST /api/revalidate — tells Next.js that cached pages are out of date.
//
// Pages are ISR (revalidate = 60): a visit to an expired page gets the old
// copy while a new one renders behind it. On a quiet site "old" means "as old
// as the previous visit", so the first visitor of the day saw yesterday's
// numbers. The feeds (and the CV upload) call this right after they write, so
// the next visitor gets a page rendered from the new data instead.
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const SCOPES = {
  /** The Daily Dash. */
  home: () => revalidatePath("/"),
  /** /about-me and every section page under it. */
  cv: () => revalidatePath("/about-me", "layout"),
} as const;

function authorised(req: Request): boolean | null {
  const secret = process.env.REVALIDATE_SECRET || process.env.UPLOAD_SECRET_KEY;
  if (!secret) return null;
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""));
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function POST(req: Request) {
  const ok = authorised(req);
  if (ok === null) return Response.json({ message: "revalidation is not configured" }, { status: 503 });
  if (!ok) return Response.json({ message: "unauthorised" }, { status: 401 });
  const scope = new URL(req.url).searchParams.get("scope") ?? "home";
  if (!(scope in SCOPES)) return Response.json({ message: "unknown scope" }, { status: 400 });
  SCOPES[scope as keyof typeof SCOPES]();
  return Response.json({ revalidated: scope, at: new Date().toISOString() });
}
