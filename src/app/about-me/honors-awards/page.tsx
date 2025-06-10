// src/app/about-me/honors-awards/page.tsx // MODIFIED: Path assumes it's moved here

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; 
import type { Metadata } from 'next';

// Import shared types
import type { HonorAwardEntry } from '@/types'; 

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; 

// Import the full honors & awards data
import honorsAwardsDataFromFile from '@/data/honorsAwards.json'; // Assuming data file is still at src/data/

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Honors & Awards - My CV`,
  description: 'A detailed list of all honors and awards received.',
};

export default function AllHonorsAwardsPage() {
  const honorsAwardsData = honorsAwardsDataFromFile as HonorAwardEntry[] || [];

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
