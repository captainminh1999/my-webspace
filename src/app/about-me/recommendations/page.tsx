// src/app/about-me/recommendations/page.tsx // MODIFIED: Path assumes it's moved here

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; 
import type { Metadata } from 'next';

// Import shared types
import type { RecommendationReceivedEntry } from '@/types'; 

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; 

// Import the full recommendations received data
import { getCvSection } from '@/lib/getCvSection';

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Recommendations Received - My CV`,
  description: 'A detailed list of all recommendations received.',
};

export default async function AllRecommendationsReceivedPage() {
  let recommendationsReceivedData: RecommendationReceivedEntry[] = [];
  try {
    recommendationsReceivedData = await getCvSection('recommendationsReceived');
  } catch (err) {
    console.error('Failed to fetch recommendations section', err);
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
            Recommendations Received
          </h1>
          
          {recommendationsReceivedData.length > 0 ? (
            <div className="space-y-8">
              {recommendationsReceivedData.map((rec, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <blockquote className="text-gray-700 dark:text-gray-300 italic mb-3 p-4 border-l-4 border-indigo-500 bg-indigo-50 dark:bg-gray-700 rounded-r-md">
                    <p className="whitespace-pre-line">&quot;{formatTextWithLineBreaks(rec.text)}&quot;</p>
                  </blockquote>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {rec.firstName} {rec.lastName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {rec.jobTitle} at {rec.company}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Received: {rec.creationDate}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No recommendations received data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
