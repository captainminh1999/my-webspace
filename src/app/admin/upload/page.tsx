// src/app/admin/upload/page.tsx
// A Server Component: who is looking is worked out here, per request, before anything reaches the browser.

import type { Metadata } from 'next';
import React from 'react';

// What this visitor may see: enrolment, sign-in, or the upload form (src/lib/admin).
import { adminView } from "@/lib/admin/deps";
// The sentence travels as a prop: importing http.ts from a client component would pull node:crypto into its chunk.
import { ENROLMENT_DISABLED } from "@/lib/admin/http";

// Import the client component that contains the passkey panel and the form
import UploadPortal from './UploadPortal.client';

// Never prerendered and never cached: the answer depends on the visitor's session cookie.
// The build's route table must show this page as ƒ.
export const dynamic = "force-dynamic";

// The root layout's title template adds the owner's name ("Upload portal — <Name>"),
// so the page names only itself, and needs no profile read of its own. The layout's
// canonical URL and Open Graph block are `/`'s: unset here, the page would claim to be
// a copy of the home page (see pageMetadata in src/lib/site.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Upload portal",
  description: "Admin portal for uploading CV data sections.",
  alternates: null,
  openGraph: null,
};

// This is the main component for the /admin/upload route
export default async function AdminUploadPage() {
  const view = await adminView();
  return <UploadPortal view={view} enrolmentDisabledReason={ENROLMENT_DISABLED} />;
}
