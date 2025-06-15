// src/app/admin/upload/page.tsx
// This file is now a Server Component.
// The "use client" directive has been removed.

import type { Metadata } from 'next';
import React from 'react';

// Import your profile data to use for the title
import { getCvSection } from '@/lib/getCvSection';

// Import the client component that contains the form
import UploadPortal from './UploadPortal.client';

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
    title: pageTitle,
    description: "Admin portal for uploading CV data sections.",
  };
}

// This is the main component for the /admin/upload route
export default function AdminUploadPage() {
  // This Server Component now renders the Client Component for the form
  return <UploadPortal />;
}
