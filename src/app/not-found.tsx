// src/app/not-found.tsx — the site's 404, inside the root layout. Prerendered as
// /_not-found and served with status 404 for every unknown URL. It reads no data of
// its own, so it looks the same during a MongoDB outage; the layout's title reads the
// profile, which makes it a page built once per deploy where MONGODB_URI is set, and
// one re-rendered every 60 s where the profile comes over HTTP (get-cv-section's fetch).
import type { Metadata } from "next";
import ErrorFrame from "@/components/ErrorFrame";

// A plain title: the root layout's template adds the owner's name. No `robots`: Next
// writes <meta name="robots" content="noindex"> into every 404 itself; setting it
// here as well prints the tag twice.
export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <ErrorFrame kicker="NOT FOUND" folio="404" head="404 · NOT FOUND" title="There is no page at this address.">
      <p>The link may be out of date, or the address mistyped. Everything on the site starts from one of these two pages.</p>
    </ErrorFrame>
  );
}
