// src/app/experience/page.tsx

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react'; // Import necessary icons
import type { Metadata } from 'next';

// Import shared types
import type { CompanyExperience } from '@/types'; // Assuming @/ is configured for src/

// Import shared helper functions
import { formatTextWithLineBreaks } from '@/utils/formatters'; // Assuming @/ is configured for src/

// Import the full experience data
import experienceDataFromFile from '@/data/experience.json';


// --- TypeScript Interfaces are now imported from '@/types' ---
// --- Helper Functions are now imported from '@/utils/formatters' ---


// --- Metadata for this specific page ---
export const metadata: Metadata = {
  title: 'All Work Experience - My Space', // Replace [Your Name] or make dynamic later
  description: 'A detailed overview of all work experience.',
};

export default function AllExperiencePage() {
  const experienceData = experienceDataFromFile as CompanyExperience[] || [];

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
            Work Experience
          </h1>
          
          {experienceData.length > 0 ? (
            experienceData.map((companyExp, companyIndex) => (
              <div key={companyIndex} className="mb-10 last:mb-0">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{companyExp.companyName}</h2>
                {(companyExp.location || companyExp.employmentType || companyExp.totalDurationAtCompany) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {companyExp.location}
                    {companyExp.employmentType && ` · ${companyExp.employmentType}`}
                    {companyExp.totalDurationAtCompany && ` · ${companyExp.totalDurationAtCompany}`}
                  </p>
                )}
                
                {companyExp.roles && companyExp.roles.map((role, roleIndex) => (
                  <div 
                    key={roleIndex} 
                    className="ml-0 md:ml-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 first-of-type:border-t-0 first-of-type:pt-0 md:first-of-type:pt-3"
                  >
                    <h3 className="text-xl font-medium text-gray-700 dark:text-white">{role.title}</h3>
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1.5">
                      {String(role.startDate)} – {String(role.endDate)} {role.duration && `(${role.duration})`}
                    </p>
                    {role.location && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{role.location}</p>}
                    
                    {role.responsibilities && role.responsibilities.length > 0 && (
                        <div className="mt-2">
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Responsibilities:</h4>
                            <div className="text-gray-600 dark:text-gray-300 text-sm space-y-0 whitespace-pre-line">
                                {role.responsibilities.map((resp, respIndex) => (
                                    <div key={respIndex}>{formatTextWithLineBreaks(resp)}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {role.skills && role.skills.length > 0 && (
                      <div className="mt-3">
                        <strong className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Skills: </strong>
                        <span className="text-xs text-gray-500 dark:text-gray-300">
                          {role.skills.join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No work experience data available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
