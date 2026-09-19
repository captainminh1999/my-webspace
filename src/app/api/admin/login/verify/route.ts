// POST /api/admin/login/verify — checks the passkey's answer and opens the 12-hour session.
// The work and its tests live in src/lib/admin/handlers.ts; this file only hands it the real store, clock and cache.
import { loginVerify } from "@/lib/admin/handlers";
import { adminDeps } from "@/lib/admin/deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = (req: Request) => loginVerify(req, adminDeps());
