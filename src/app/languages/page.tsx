// src/app/languages/page.tsx

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; // For back button
import type { Metadata } from 'next';

// Import shared types
import type { LanguageEntry } from '@/types'; // Assuming @/ is configured for src/

// Import the full languages data
import languagesDataFromFile from '@/data/languages.json';

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Languages - My Space`, 
  description: 'A list of languages and proficiency levels.',
};

export default function AllLanguagesPage() {
  // Type assertion for the imported data, with a fallback to an empty array
  const languagesData = languagesDataFromFile as LanguageEntry[] || [];

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
            Languages
          </h1>
          
          {languagesData.length > 0 ? (
            <div className="space-y-4"> {/* Adjusted spacing for language list */}
              {languagesData.map((lang, index) => (
                <div key={index} className="pb-4 last:pb-0"> {/* Removed border for simpler list */}
                  <p className="text-lg text-gray-800 dark:text-white">
                    <span className="font-semibold">{lang.name}:</span> {lang.proficiency}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No language data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
