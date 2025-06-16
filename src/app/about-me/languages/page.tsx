// src/app/about-me/languages/page.tsx // MODIFIED: Path assumes it's moved here

import React from 'react';

export const revalidate = 60;
import SectionPageLayout from '@/components/SectionPageLayout';
import type { Metadata } from 'next';

// Import shared types
import type { LanguageEntry } from '@/types';

// Import the full languages data
import { getCvSection } from '@/lib/getCvSection';

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Languages - My CV`,
  description: 'A list of languages and proficiency levels.',
};

export default async function AllLanguagesPage() {
  let languagesData: LanguageEntry[] = [];
  try {
    languagesData = await getCvSection('languages');
  } catch (err) {
    console.error('Failed to fetch languages section', err);
  }

  return (
    <SectionPageLayout title="Languages">
      {languagesData.length > 0 ? (
        <div className="space-y-4">
          {languagesData.map((lang, index) => (
            <div key={index} className="pb-4 last:pb-0">
              <p className="text-lg text-gray-800 dark:text-white">
                <span className="font-semibold">{lang.name}:</span> {lang.proficiency}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">No language data available.</p>
      )}
    </SectionPageLayout>
  );
}
