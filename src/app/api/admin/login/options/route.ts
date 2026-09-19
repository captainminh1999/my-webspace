// POST /api/admin/login/options — a sign-in challenge, the same answer whether or not a passkey exists.
// The work and its tests live in src/lib/admin/handlers.ts; this file only hands it the real store, clock and cache.
import { loginOptions } from "@/lib/admin/handlers";
import { adminDeps } from "@/lib/admin/deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = (req: Request) => loginOptions(req, adminDeps());
