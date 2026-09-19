// After a write, tell the site that its cached pages are out of date (see
// src/app/api/revalidate/route.ts). Never throws and never fails the caller:
// without it the page still catches up through its 60 s ISR window, one visit late.
export async function refreshPages(scope: "home" | "cv"): Promise<string> {
  const base = process.env.URL || "https://nhatminh.dev";
  const secret = process.env.REVALIDATE_SECRET || process.env.UPLOAD_SECRET_KEY;
  if (!secret) return "skipped: no secret";
  try {
    const res = await fetch(`${base}/api/revalidate?scope=${scope}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok ? "ok" : `http ${res.status}`;
  } catch (err) {
    return err instanceof Error ? err.name : "failed";
  }
}
