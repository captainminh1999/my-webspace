// POST /api/admin/upload — one CV section as CSV; needs a session (the secret no longer opens this).
// The work and its tests live in src/lib/admin/handlers.ts; this file only hands it the real store, clock and cache.
import { upload } from "@/lib/admin/handlers";
import { adminDeps } from "@/lib/admin/deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = (req: Request) => upload(req, adminDeps());
