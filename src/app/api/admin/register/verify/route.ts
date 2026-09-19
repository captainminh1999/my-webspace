// POST /api/admin/register/verify — checks the new passkey and stores it; the first one also signs the owner in.
// The work and its tests live in src/lib/admin/handlers.ts; this file only hands it the real store, clock and cache.
import { registerVerify } from "@/lib/admin/handlers";
import { adminDeps } from "@/lib/admin/deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = (req: Request) => registerVerify(req, adminDeps());
