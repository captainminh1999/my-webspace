// src/app/admin/upload/page.tsx
// A Server Component: who is looking is worked out here, per request, before anything reaches the browser.

import type { Metadata } from 'next';
import React from 'react';

// Import your profile data to use for the title
import { getCvSection } from "@/lib/cv";

// What this visitor may see: enrolment, sign-in, or the upload form (src/lib/admin).
import { adminView } from "@/lib/admin/deps";
// The sentence travels as a prop: importing http.ts from a client component would pull node:crypto into its chunk.
import { ENROLMENT_DISABLED } from "@/lib/admin/http";

// Import the client component that contains the passkey panel and the form
import UploadPortal from './UploadPortal.client';

// Never prerendered and never cached: the answer depends on the visitor's session cookie.
// The build's route table must show this page as ƒ.
export const dynamic = "force-dynamic";

// Define a simple interface for the part of profileData we need
interface ProfileTitleData {
  firstName?: string | null;
  lastName?: string | null;
}


// Dynamically generate metadata for THIS PAGE
export async function generateMetadata(): Promise<Metadata> {
  let profileDataForTitle: ProfileTitleData | null = null;
  try {
    profileDataForTitle = (await getCvSection('profile')) as ProfileTitleData | null;
  } catch (err) {
    console.error('Failed to fetch profile data for metadata', err);
  }
  const firstName = profileDataForTitle?.firstName;
  const lastName = profileDataForTitle?.lastName;

  let pageTitle = "Upload Portal - Admin"; // Default/fallback title for this page
  if (firstName && lastName) {
    pageTitle = `${firstName} ${lastName} - Upload Portal`;
  } else if (firstName) {
    pageTitle = `${firstName} - Upload Portal`;
  } else if (lastName) {
    pageTitle = `${lastName} - Upload Portal`;
  }

  return {
    robots: { index: false, follow: false },
    title: pageTitle,
    description: "Admin portal for uploading CV data sections.",
  };
}

// This is the main component for the /admin/upload route
export default async function AdminUploadPage() {
  const view = await adminView();
  return <UploadPortal view={view} enrolmentDisabledReason={ENROLMENT_DISABLED} />;
}
