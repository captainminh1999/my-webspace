// src/app/recommendations/page.tsx

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; // For back button
import type { Metadata } from 'next';

// Import shared types
import type { RecommendationReceivedEntry } from '@/types'; // Assuming @/ is configured for src/

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; // Assuming @/ is configured for src/

// Import the full recommendations received data
import recommendationsReceivedDataFromFile from '@/data/recommendationsReceived.json';

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Recommendations Received - My Space`,
  description: 'A detailed list of all recommendations received.',
};

export default function AllRecommendationsReceivedPage() {
  const recommendationsReceivedData = recommendationsReceivedDataFromFile as RecommendationReceivedEntry[] || [];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors duration-150 group">
            <ArrowLeft size={20} className="mr-2 transition-transform duration-150 group-hover:-translate-x-1" />
            Back to Home
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
