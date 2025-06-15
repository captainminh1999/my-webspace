// src/app/about-me/volunteering/page.tsx // MODIFIED: Path assumes it's moved here

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; 
import type { Metadata } from 'next';

// Import shared types
import type { VolunteeringEntry } from '@/types'; 

// Import shared helper functions
import { formatTextWithLineBreaks, getDisplayCause } from '@/utils/formatters'; 

// Import the full volunteering data
import { getCvSection } from '@/lib/getCvSection';

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Volunteering Activities - My CV`,
  description: 'A detailed list of all volunteering activities.',
};

export default async function AllVolunteeringPage() {
  let volunteeringData: VolunteeringEntry[] = [];
  try {
    volunteeringData = await getCvSection('volunteering');
  } catch (err) {
    console.error('Failed to fetch volunteering section', err);
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* MODIFIED: Back to Home Link */}
        <div className="mb-8">
          <Link href="/about-me" className="inline-flex items-center text-black dark:text-white hover:underline transition-colors duration-150 group">
            <ArrowLeft size={20} className="mr-2 transition-transform duration-150 group-hover:-translate-x-1" />
            Back to Main CV
          </Link>
        </div>

        <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b-2 border-indigo-500">
            Volunteering Experience
          </h1>
          
          {volunteeringData.length > 0 ? (
            <div className="space-y-8">
              {volunteeringData.map((vol, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{vol.role}</h2>
                  <p className="text-md text-gray-700 dark:text-gray-300">{vol.companyName}</p>
                  {(vol.startedOn || vol.finishedOn) && (
                       <p className="text-sm text-indigo-500 dark:text-indigo-400 my-1">
                          {vol.startedOn}{vol.finishedOn && vol.startedOn ? ` - ${vol.finishedOn}` : vol.finishedOn || ''}
                      </p>
                  )}
                  {vol.cause && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {getDisplayCause(vol.cause)}
                    </p>
                  )}
                  {vol.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">
                      {formatTextWithLineBreaks(vol.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No volunteering data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
