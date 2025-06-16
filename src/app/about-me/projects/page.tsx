// src/app/about-me/projects/page.tsx // MODIFIED: Path assumes it's moved here

import React from 'react';

export const revalidate = 60;
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react'; 
import type { Metadata } from 'next';

// Import shared types
import type { ProjectEntry } from '@/types'; 

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; 

// Import the full projects data
import { getCvSection } from '@/lib/getCvSection';

// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: `All Projects - My CV`,
  description: 'A detailed list of all projects.',
};

export default async function AllProjectsPage() {
  let projectsData: ProjectEntry[] = [];
  try {
    projectsData = await getCvSection('projects');
  } catch (err) {
    console.error('Failed to fetch projects section', err);
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
            Projects
          </h1>
          
          {projectsData.length > 0 ? (
            <div className="space-y-8">
              {projectsData.map((proj, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{proj.title}</h2>
                  {(proj.startedOn || proj.finishedOn) && (
                      <p className="text-sm text-indigo-500 dark:text-indigo-400 my-1">
                          {proj.startedOn}{proj.finishedOn && proj.startedOn ? ` - ${proj.finishedOn}` : proj.finishedOn || ''}
                      </p>
                  )}
                  {proj.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 my-2 whitespace-pre-line">
                      {formatTextWithLineBreaks(proj.description)}
                    </p>
                  )}
                  {proj.url && 
                    <a 
                      href={proj.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-2 inline-flex items-center gap-1 text-black dark:text-white hover:underline text-sm"
                    >
                      <ExternalLink size={14} /> View Project
                    </a>
                  }
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No projects data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
