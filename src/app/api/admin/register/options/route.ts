// POST /api/admin/register/options — the options for creating a passkey: with the secret while none exists, with a session afterwards.
// The work and its tests live in src/lib/admin/handlers.ts; this file only hands it the real store, clock and cache.
import { registerOptions } from "@/lib/admin/handlers";
import { adminDeps } from "@/lib/admin/deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = (req: Request) => registerOptions(req, adminDeps());
