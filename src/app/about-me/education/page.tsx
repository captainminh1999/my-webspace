// src/app/education/page.tsx

import React from 'react';

export const revalidate = 60;
import SectionPageLayout from '@/components/SectionPageLayout';
import type { Metadata } from 'next';

// Import shared types
import type { EducationEntry } from '@/types'; // Assuming @/ is configured for src/

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; // Assuming @/ is configured for src/

// Import the full education data
import { getCvSection } from '@/lib/getCvSection';


// --- Metadata for this specific page ---
// You can make this dynamic if you import profileData here too
// For now, using a static title, but you can enhance it.
// import profileDataForTitleFromFile from '@/data/profile.json';
// const profileName = (profileDataForTitleFromFile as any)?.firstName + ' ' + (profileDataForTitleFromFile as any)?.lastName || "My";

export const metadata: Metadata = {
  title: `All Education - My Space`, // Dynamically set based on profile if desired
  description: 'Detailed overview of all educational qualifications and activities.',
};

export default async function AllEducationPage() {
  let educationData: EducationEntry[] = [];
  try {
    educationData = await getCvSection('education');
  } catch (err) {
    console.error('Failed to fetch education section', err);
  }

  return (
    <SectionPageLayout title="Education">
          {educationData.length > 0 ? (
            <div className="space-y-8">
              {educationData.map((edu, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{edu.schoolName}</h2>
                  {edu.degreeName && (
                    <p className="text-md text-gray-700 dark:text-gray-300">{edu.degreeName}</p>
                  )}
                  <p className="text-sm text-indigo-500 dark:text-indigo-400 my-1">
                    {String(edu.startDate)} – {String(edu.endDate)}
                  </p>
                  {edu.notes && (
                    <div className="mt-2">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-0.5">Notes:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {formatTextWithLineBreaks(edu.notes)}
                      </p>
                    </div>
                  )}
                  {edu.activities && (
                     <div className="mt-2">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-0.5">Activities & Societies:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {formatTextWithLineBreaks(edu.activities)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No education data available.</p>
          )}
        </SectionPageLayout>
  );
}
