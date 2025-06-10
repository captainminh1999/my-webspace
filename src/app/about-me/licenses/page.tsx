// src/app/about-me/licenses/page.tsx // MODIFIED: Path assumes it's moved here

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react'; 
import type { Metadata } from 'next';

// Import shared types
import type { LicenseCertificationEntry } from '@/types'; 

// Import the full licenses & certifications data
import licensesDataFromFile from '@/data/licenses.json'; // Assuming data file is still at src/data/

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Licenses & Certifications - My CV`,
  description: 'A detailed list of all licenses and certifications.',
};

export default function AllLicensesPage() {
  const licensesData = licensesDataFromFile as LicenseCertificationEntry[] || [];

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
            Licenses & Certifications
          </h1>
          
          {licensesData.length > 0 ? (
            <div className="space-y-8">
              {licensesData.map((lic, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{lic.name}</h2>
                  <p className="text-md text-gray-700 dark:text-gray-300">{lic.authority}</p>
                  {(lic.startedOn || lic.finishedOn) && (
                      <p className="text-sm text-indigo-500 dark:text-indigo-400 my-1">
                          Issued: {lic.startedOn}{lic.finishedOn && lic.startedOn ? ` - ${lic.finishedOn}` : lic.finishedOn || ''}
                      </p>
                  )}
                  {lic.licenseNumber && <p className="text-sm text-gray-600 dark:text-gray-300">Credential ID: {lic.licenseNumber}</p>}
                  {lic.url && (
                    <a
                      href={lic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-black dark:text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition duration-150"
                    >
                      <ExternalLink size={14} /> Show Credential
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No licenses or certifications data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
