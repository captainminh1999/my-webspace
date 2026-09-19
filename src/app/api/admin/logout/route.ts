// POST /api/admin/logout — deletes the session on the server and clears the cookie.
// The work and its tests live in src/lib/admin/handlers.ts; this file only hands it the real store, clock and cache.
import { logout } from "@/lib/admin/handlers";
import { adminDeps } from "@/lib/admin/deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = (req: Request) => logout(req, adminDeps());
