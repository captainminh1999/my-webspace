// src/app/honors-awards/page.tsx

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; // For back button
import type { Metadata } from 'next';

// Import shared types
import type { HonorAwardEntry } from '@/types'; // Assuming @/ is configured for src/

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; // Assuming @/ is configured for src/

// Import the full honors & awards data
import honorsAwardsDataFromFile from '@/data/honorsAwards.json';


// --- Metadata for this specific page ---
// You can make this dynamic if you import profileData here too
// For now, using a static title, but you can enhance it.
// import profileDataForTitleFromFile from '@/data/profile.json';
// const profileName = (profileDataForTitleFromFile as any)?.firstName + ' ' + (profileDataForTitleFromFile as any)?.lastName || "My";

export const metadata: Metadata = {
  title: `All Honors & Awards - My Space`, // Dynamically set based on profile if desired
  description: 'A detailed list of all honors and awards received.',
};

export default function AllHonorsAwardsPage() {
  // Type assertion for the imported data, with a fallback to an empty array
  const honorsAwardsData = honorsAwardsDataFromFile as HonorAwardEntry[] || [];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Back to Home Link */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors duration-150 group">
            <ArrowLeft size={20} className="mr-2 transition-transform duration-150 group-hover:-translate-x-1" />
            Back to Home
          </Link>
        </div>

        {/* Section Content */}
        <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b-2 border-indigo-500">
            Honors & Awards
          </h1>
          
          {honorsAwardsData.length > 0 ? (
            <div className="space-y-8">
              {honorsAwardsData.map((honor, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{honor.title}</h2>
                  <p className="text-sm text-indigo-500 dark:text-indigo-400 my-1">
                    Issued: {honor.issuedOn}
                  </p>
                  {honor.description && (
                    <div className="mt-2">
                      {/* If description can also contain bullet points, you might want a label */}
                      {/* <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-0.5">Details:</h4> */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {formatTextWithLineBreaks(honor.description)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No honors or awards data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
