// src/app/education/page.tsx

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; // For back button
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
  const educationData: EducationEntry[] = await getCvSection('education');

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Back to Main CV Link */}
        <div className="mb-8">
          <Link href="/about-me" className="inline-flex items-center text-black dark:text-white hover:underline transition-colors duration-150 group">
            <ArrowLeft size={20} className="mr-2 transition-transform duration-150 group-hover:-translate-x-1" />
            Back to Main CV
          </Link>
        </div>

        {/* Section Content */}
        <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b-2 border-indigo-500">
            Education
          </h1>
          
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
        </section>
      </div>
    </main>
  );
}
