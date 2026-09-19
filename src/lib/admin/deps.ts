// src/lib/admin/deps.ts — the Next side of the admin: the real store, the real clock, the real cache.
// Everything that decides something lives in the files next to this one and is tested without Next.
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { connectToDatabase } from "../mongodb.ts";
import { applyWrites } from "./cvUpload.ts";
import type { AdminDeps } from "./handlers.ts";
import { sessionCookieName } from "./http.ts";
import { mongoStore } from "./mongoStore.ts";
import { relyingParty } from "./rp.ts";
import { hostHint, viewFor, type AdminView } from "./view.ts";

export function adminDeps(): AdminDeps {
  return {
    store: mongoStore,
    rp: relyingParty(), // no argument: rp.ts explains why the default has to be the one deciding
    now: () => new Date(),
    enrolmentSecret: process.env.UPLOAD_SECRET_KEY,
    cv: {
      apply: async (writes) => applyWrites((await connectToDatabase()).db(process.env.MONGODB_DB || "cv"), writes),
      // The same two scopes as /api/revalidate: the CV pages always, the dashboard too when the profile changed.
      revalidate(section) {
        revalidatePath("/about-me", "layout");
        if (section === "profile") revalidatePath("/");
      },
    },
  };
}

/** For the page (a server component). The client never asks "am I signed in?" — it calls router.refresh(). */
export async function adminView(): Promise<AdminView> {
  const deps = adminDeps();
  const hint = hostHint(deps.rp, (await headers()).get("host")); // Host header, for the hint text only — never for a decision
  const token = (await cookies()).get(sessionCookieName(deps.rp))?.value;
  return viewFor(deps, token, hint);
}
